#!/usr/bin/env python3
"""
Builds a genuine, installable Android APK (public/GOLDRIX.apk) for GOLDRIX.
Includes:
1. Binary AndroidManifest.xml (AXML format) with android:icon="@drawable/icon" (0x7f010000)
2. Binary resources.arsc (RES_TABLE_TYPE) mapping 0x7f010000 -> res/drawable/icon.png (uncompressed, 4-byte aligned)
3. Dalvik bytecode classes.dex (MainActivity with fullscreen WebView, JS & DOMStorage enabled)
4. Official GOLDRIX App Icon res/drawable/icon.png
5. Cryptographic v1 (JAR META-INF/CERT.RSA) + v2 (APK Signature Scheme v2 Block) signatures
"""

import struct
import zlib
import hashlib
import base64
import os
import subprocess
import tempfile
import sys

APP_URL = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith("http") else "https://goldrix-o3gl.onrender.com/"
PACKAGE_NAME = "com.goldrix.platform"
ACTIVITY_NAME = "com.goldrix.platform.MainActivity"
APP_LABEL = "GOLDRIX"
ICON_RES_ID = 0x7F010000


# ============================================================================
# 1. ANDROID BINARY XML (AXML) GENERATOR FOR AndroidManifest.xml
# ============================================================================
def build_axml() -> bytes:
    # Resource IDs for standard Android attributes (must be sorted at the start of string pool)
    # 0x01010000: theme
    # 0x01010001: label
    # 0x01010002: icon
    # 0x01010003: name
    # 0x0101001e: exported
    # 0x0101001f: configChanges
    # 0x0101020c: minSdkVersion
    # 0x0101021b: versionCode
    # 0x0101021c: versionName
    # 0x01010270: targetSdkVersion
    # 0x0101054c: usesCleartextTraffic
    attr_Order = [
        ("theme", 0x01010000),
        ("label", 0x01010001),
        ("icon", 0x01010002),
        ("name", 0x01010003),
        ("exported", 0x0101001E),
        ("configChanges", 0x0101001F),
        ("minSdkVersion", 0x0101020C),
        ("versionCode", 0x0101021B),
        ("versionName", 0x0101021C),
        ("targetSdkVersion", 0x01010270),
        ("usesCleartextTraffic", 0x0101054C),
    ]

    other_strings = [
        "android",
        "http://schemas.android.com/apk/res/android",
        "manifest",
        "package",
        PACKAGE_NAME,
        "3.0.0",
        "uses-sdk",
        "uses-permission",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "application",
        APP_LABEL,
        "activity",
        ACTIVITY_NAME,
        "intent-filter",
        "action",
        "android.intent.action.MAIN",
        "category",
        "android.intent.category.LAUNCHER",
        "",
    ]

    strings = [name for name, _ in attr_Order] + other_strings
    str_idx = {s: i for i, s in enumerate(strings)}

    # Build String Pool Chunk (UTF-16LE)
    encoded_strings = []
    for s in strings:
        u16 = s.encode("utf-16le")
        length = len(s)
        blob = struct.pack("<H", length) + u16 + b"\x00\x00"
        encoded_strings.append(blob)

    offsets = []
    cur = 0
    for b in encoded_strings:
        offsets.append(cur)
        cur += len(b)

    strings_blob = b"".join(encoded_strings)
    while len(strings_blob) % 4 != 0:
        strings_blob += b"\x00"

    string_count = len(strings)
    strings_start = 28 + (string_count * 4)
    sp_size = strings_start + len(strings_blob)
    sp_header = struct.pack(
        "<HHIIIIII",
        0x0001,  # RES_STRING_POOL_TYPE
        28,      # header size
        sp_size,
        string_count,
        0,       # styleCount
        0,       # flags (UTF-16)
        strings_start,
        0,       # stylesStart
    )
    sp_offsets = b"".join(struct.pack("<I", o) for o in offsets)
    sp_chunk = sp_header + sp_offsets + strings_blob

    # Build Resource Map Chunk (0x0180)
    res_ids = [res_id for _, res_id in attr_Order]
    rm_size = 8 + len(res_ids) * 4
    rm_chunk = struct.pack("<HHI", 0x0180, 8, rm_size) + b"".join(
        struct.pack("<I", r) for r in res_ids
    )

    ns_prefix = str_idx["android"]
    ns_uri = str_idx["http://schemas.android.com/apk/res/android"]
    empty_ns = 0xFFFFFFFF

    def make_ns(chunk_type: int, line: int) -> bytes:
        return struct.pack(
            "<HHIIIII",
            chunk_type,
            16,
            24,
            line,
            0xFFFFFFFF,
            ns_prefix,
            ns_uri,
        )

    TYPE_STRING = 0x03
    TYPE_INT_DEC = 0x10
    TYPE_INT_HEX = 0x11
    TYPE_INT_BOOLEAN = 0x12
    TYPE_REFERENCE = 0x01

    def attr_str(ns: int, name_s: str, val_s: str) -> bytes:
        vi = str_idx[val_s]
        return struct.pack(
            "<IIIHBBI",
            ns,
            str_idx[name_s],
            vi,
            8,
            0,
            TYPE_STRING,
            vi,
        )

    def attr_int(ns: int, name_s: str, val: int, val_type: int = TYPE_INT_DEC) -> bytes:
        return struct.pack(
            "<IIIHBBI",
            ns,
            str_idx[name_s],
            0xFFFFFFFF,
            8,
            0,
            val_type,
            val & 0xFFFFFFFF,
        )

    def start_element(line: int, name_s: str, attrs: list[bytes]) -> bytes:
        total_size = 36 + len(attrs) * 20
        hdr = struct.pack(
            "<HHIII",
            0x0102,
            16,
            total_size,
            line,
            0xFFFFFFFF,
        )
        ext = struct.pack(
            "<IIHHHHHH",
            0xFFFFFFFF,
            str_idx[name_s],
            20,
            20,
            len(attrs),
            0,
            0,
            0,
        )
        return hdr + ext + b"".join(attrs)

    def end_element(line: int, name_s: str) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0103,  # RES_XML_END_ELEMENT_TYPE
            16,
            24,
            line,
            0xFFFFFFFF,
            0xFFFFFFFF,
            str_idx[name_s],
        )

    xml_chunks = [
        make_ns(0x0100, 2),
        # <manifest package="com.goldrix.platform" android:versionCode="30" android:versionName="3.0.0">
        start_element(
            2,
            "manifest",
            [
                attr_int(ns_uri, "versionCode", 30, TYPE_INT_DEC),
                attr_str(ns_uri, "versionName", "3.0.0"),
                attr_str(empty_ns, "package", PACKAGE_NAME),
            ],
        ),
        # <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
        start_element(
            5,
            "uses-sdk",
            [
                attr_int(ns_uri, "minSdkVersion", 24, TYPE_INT_DEC),
                attr_int(ns_uri, "targetSdkVersion", 34, TYPE_INT_DEC),
            ],
        ),
        end_element(5, "uses-sdk"),
        # <uses-permission android:name="android.permission.INTERNET" />
        start_element(
            7,
            "uses-permission",
            [attr_str(ns_uri, "name", "android.permission.INTERNET")],
        ),
        end_element(7, "uses-permission"),
        # <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
        start_element(
            8,
            "uses-permission",
            [attr_str(ns_uri, "name", "android.permission.ACCESS_NETWORK_STATE")],
        ),
        end_element(8, "uses-permission"),
        # <application android:label="GOLDRIX" android:icon="@drawable/icon" android:usesCleartextTraffic="true">
        start_element(
            10,
            "application",
            [
                attr_str(ns_uri, "label", APP_LABEL),
                attr_int(ns_uri, "icon", ICON_RES_ID, TYPE_REFERENCE),
                attr_int(ns_uri, "usesCleartextTraffic", 0xFFFFFFFF, TYPE_INT_BOOLEAN),
            ],
        ),
        # <activity android:theme="@android:style/Theme.NoTitleBar" android:label="GOLDRIX" android:icon="@drawable/icon" android:name="com.goldrix.trading.MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden">
        start_element(
            12,
            "activity",
            [
                attr_int(ns_uri, "theme", 0x01030006, TYPE_REFERENCE),  # @android:style/Theme.NoTitleBar
                attr_str(ns_uri, "label", APP_LABEL),
                attr_int(ns_uri, "icon", ICON_RES_ID, TYPE_REFERENCE),
                attr_str(ns_uri, "name", ACTIVITY_NAME),
                attr_int(ns_uri, "exported", 0xFFFFFFFF, TYPE_INT_BOOLEAN),
                attr_int(ns_uri, "configChanges", 0x000004A0, TYPE_INT_HEX),
            ],
        ),
        start_element(14, "intent-filter", []),
        start_element(
            15,
            "action",
            [attr_str(ns_uri, "name", "android.intent.action.MAIN")],
        ),
        end_element(15, "action"),
        start_element(
            16,
            "category",
            [attr_str(ns_uri, "name", "android.intent.category.LAUNCHER")],
        ),
        end_element(16, "category"),
        end_element(17, "intent-filter"),
        end_element(18, "activity"),
        end_element(19, "application"),
        end_element(20, "manifest"),
        make_ns(0x0101, 20),
    ]

    body = sp_chunk + rm_chunk + b"".join(xml_chunks)
    file_header = struct.pack("<HHI", 0x0003, 8, 8 + len(body))
    return file_header + body


# ============================================================================
# 1B. ANDROID RESOURCE TABLE (resources.arsc) GENERATOR FOR @drawable/icon
# ============================================================================
def make_string_pool_utf16(strings: list[str]) -> bytes:
    encoded = []
    for s in strings:
        u16 = s.encode("utf-16le")
        blob = struct.pack("<H", len(s)) + u16 + b"\x00\x00"
        encoded.append(blob)
    offsets = []
    cur = 0
    for b in encoded:
        offsets.append(cur)
        cur += len(b)
    blob_all = b"".join(encoded)
    while len(blob_all) % 4 != 0:
        blob_all += b"\x00"
    count = len(strings)
    strings_start = 28 + count * 4
    total_size = strings_start + len(blob_all)
    hdr = struct.pack(
        "<HHIIIIII",
        0x0001,  # RES_STRING_POOL_TYPE
        28,
        total_size,
        count,
        0,
        0,       # UTF-16
        strings_start,
        0,
    )
    offs = b"".join(struct.pack("<I", o) for o in offsets)
    return hdr + offs + blob_all


def build_arsc() -> bytes:
    """
    Builds a valid Android binary resources.arsc mapping:
    0x7f010000 -> "res/drawable/icon.png"
    """
    # 1. Global String Pool: ["res/drawable/icon.png"]
    global_sp = make_string_pool_utf16(["res/drawable/icon.png"])

    # 2. Type String Pool: ["drawable"]
    type_sp = make_string_pool_utf16(["drawable"])

    # 3. Key String Pool: ["icon"]
    key_sp = make_string_pool_utf16(["icon"])

    # 4. ResTable_typeSpec (0x0202) for type id = 1 ("drawable"), entryCount = 1
    # Header: type(H=0x0202), headerSize(H=16), size(I=20), id(B=1), res0(B=0), res1(H=0), entryCount(I=1)
    type_spec_chunk = struct.pack("<HHIbbHI", 0x0202, 16, 20, 1, 0, 0, 1) + struct.pack("<I", 0)

    # 5. ResTable_type (0x0201) for type id = 1, entryCount = 1
    # ResTable_config is 48 bytes (size=48, rest zeros = default configuration)
    config_size = 48
    config_bytes = struct.pack("<I", config_size) + b"\x00" * (config_size - 4)
    type_header_size = 20 + config_size  # 68 bytes
    entries_start = type_header_size + 4  # 1 entry offset (4 bytes) = 72

    # ResTable_entry (8 bytes: size=8, flags=0, key=0) + Res_value (8 bytes: size=8, res0=0, dataType=0x03 STRING, data=0)
    entry_and_value = struct.pack("<HHI", 8, 0, 0) + struct.pack("<HBBI", 8, 0, 0x03, 0)
    type_chunk_size = entries_start + len(entry_and_value)

    type_chunk_hdr = (
        struct.pack(
            "<HHIbbHII",
            0x0201,            # RES_TABLE_TYPE_TYPE
            type_header_size,  # headerSize (68)
            type_chunk_size,   # total chunk size (88)
            1,                 # id = 1 (drawable)
            0,
            0,
            1,                 # entryCount = 1
            entries_start,     # entriesStart (72)
        )
        + config_bytes
        + struct.pack("<I", 0)  # offset for entry 0 = 0
        + entry_and_value
    )

    # 6. ResTable_package (0x0200)
    # Header size = 288 bytes:
    # type(H=0x0200), headerSize(H=288), size(I), id(I=0x7f), name(128 char16 = 256 bytes),
    # typeStrings(I), lastPublicType(I), keyStrings(I), lastPublicKey(I), typeIdOffset(I)
    pkg_header_size = 288
    pkg_name_u16 = PACKAGE_NAME.encode("utf-16le")
    pkg_name_padded = pkg_name_u16 + b"\x00" * (256 - len(pkg_name_u16))

    type_strings_off = pkg_header_size
    key_strings_off = type_strings_off + len(type_sp)
    pkg_body = type_sp + key_sp + type_spec_chunk + type_chunk_hdr
    pkg_total_size = pkg_header_size + len(pkg_body)

    pkg_hdr = (
        struct.pack("<HHII", 0x0200, pkg_header_size, pkg_total_size, 0x7F)
        + pkg_name_padded
        + struct.pack(
            "<IIIII",
            type_strings_off,
            1,  # lastPublicType
            key_strings_off,
            1,  # lastPublicKey
            0,  # typeIdOffset
        )
    )
    pkg_chunk = pkg_hdr + pkg_body

    # 7. Top-level ResTable_header (0x0002), headerSize = 12, packageCount = 1
    table_total_size = 12 + len(global_sp) + len(pkg_chunk)
    table_hdr = struct.pack("<HHII", 0x0002, 12, table_total_size, 1)
    return table_hdr + global_sp + pkg_chunk


# ============================================================================
# 2. DALVIK EXECUTABLE (classes.dex) GENERATOR
# ============================================================================
def uleb128(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value != 0:
            byte |= 0x80
        out.append(byte)
        if value == 0:
            break
    return bytes(out)


def build_dex() -> bytes:
    """
    Constructs a valid DEX 035 file defining:
    package com.goldrix.trading;
    public class MainActivity extends android.app.Activity {
        public MainActivity() { super(); }
        protected void onCreate(android.os.Bundle b) {
            super.onCreate(b);
            android.webkit.WebView w = new android.webkit.WebView(this);
            android.webkit.WebSettings s = w.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            w.setWebViewClient(new android.webkit.WebViewClient());
            this.setContentView(w);
            w.loadUrl(APP_URL);
        }
    }
    """
    raw_strings = sorted(
        [
            "<init>",
            "L",
            "Landroid/app/Activity;",
            "Landroid/content/Context;",
            "Landroid/os/Bundle;",
            "Landroid/view/View;",
            "Landroid/webkit/WebSettings;",
            "Landroid/webkit/WebView;",
            "Landroid/webkit/WebViewClient;",
            "Lcom/goldrix/platform/MainActivity;",
            "Ljava/lang/Object;",
            "Ljava/lang/String;",
            "V",
            "VL",
            "VZ",
            "Z",
            "getSettings",
            APP_URL,
            "loadUrl",
            "onCreate",
            "setContentView",
            "setDomStorageEnabled",
            "setJavaScriptEnabled",
            "setWebViewClient",
        ]
    )
    s_idx = {s: i for i, s in enumerate(raw_strings)}

    type_strs = sorted(
        [
            "Landroid/app/Activity;",
            "Landroid/content/Context;",
            "Landroid/os/Bundle;",
            "Landroid/view/View;",
            "Landroid/webkit/WebSettings;",
            "Landroid/webkit/WebView;",
            "Landroid/webkit/WebViewClient;",
            "Lcom/goldrix/platform/MainActivity;",
            "Ljava/lang/Object;",
            "Ljava/lang/String;",
            "V",
            "Z",
        ],
        key=lambda x: s_idx[x],
    )
    t_idx = {t: i for i, t in enumerate(type_strs)}

    protos_raw = [
        ("L", "Landroid/webkit/WebSettings;", []),
        ("V", "V", []),
        ("VL", "V", ["Landroid/content/Context;"]),
        ("VL", "V", ["Landroid/os/Bundle;"]),
        ("VL", "V", ["Landroid/view/View;"]),
        ("VL", "V", ["Landroid/webkit/WebViewClient;"]),
        ("VL", "V", ["Ljava/lang/String;"]),
        ("VZ", "V", ["Z"]),
    ]
    protos_sorted = sorted(
        protos_raw,
        key=lambda p: (t_idx[p[1]], [t_idx[x] for x in p[2]]),
    )
    p_idx = {
        (p[1], tuple(p[2])): i for i, p in enumerate(protos_sorted)
    }

    methods_raw = [
        ("Landroid/app/Activity;", ("V", ()), "<init>"),
        ("Landroid/app/Activity;", ("V", ("Landroid/os/Bundle;",)), "onCreate"),
        ("Landroid/app/Activity;", ("V", ("Landroid/view/View;",)), "setContentView"),
        ("Landroid/webkit/WebSettings;", ("V", ("Z",)), "setDomStorageEnabled"),
        ("Landroid/webkit/WebSettings;", ("V", ("Z",)), "setJavaScriptEnabled"),
        ("Landroid/webkit/WebView;", ("V", ("Landroid/content/Context;",)), "<init>"),
        ("Landroid/webkit/WebView;", ("Landroid/webkit/WebSettings;", ()), "getSettings"),
        ("Landroid/webkit/WebView;", ("V", ("Ljava/lang/String;",)), "loadUrl"),
        ("Landroid/webkit/WebView;", ("V", ("Landroid/webkit/WebViewClient;",)), "setWebViewClient"),
        ("Landroid/webkit/WebViewClient;", ("V", ()), "<init>"),
        ("Lcom/goldrix/platform/MainActivity;", ("V", ()), "<init>"),
        ("Lcom/goldrix/platform/MainActivity;", ("V", ("Landroid/os/Bundle;",)), "onCreate"),
    ]
    methods_sorted = sorted(
        methods_raw,
        key=lambda m: (t_idx[m[0]], s_idx[m[2]], p_idx[m[1]]),
    )
    m_idx = {m: i for i, m in enumerate(methods_sorted)}

    m_activity_init = m_idx[("Landroid/app/Activity;", ("V", ()), "<init>")]
    init_insns = struct.pack("<BBHH", 0x70, 0x10, m_activity_init, 0x0000) + struct.pack("<BB", 0x0E, 0x00)
    init_code_item = struct.pack(
        "<HHHHII",
        1,  # registers_size
        1,  # ins_size
        1,  # outs_size
        0,  # tries_size
        0,  # debug_info_off
        len(init_insns) // 2,
    ) + init_insns

    m_super_oncreate = m_idx[("Landroid/app/Activity;", ("V", ("Landroid/os/Bundle;",)), "onCreate")]
    m_set_content = m_idx[("Landroid/app/Activity;", ("V", ("Landroid/view/View;",)), "setContentView")]
    m_wv_init = m_idx[("Landroid/webkit/WebView;", ("V", ("Landroid/content/Context;",)), "<init>")]
    m_wv_settings = m_idx[("Landroid/webkit/WebView;", ("Landroid/webkit/WebSettings;", ()), "getSettings")]
    m_set_js = m_idx[("Landroid/webkit/WebSettings;", ("V", ("Z",)), "setJavaScriptEnabled")]
    m_set_dom = m_idx[("Landroid/webkit/WebSettings;", ("V", ("Z",)), "setDomStorageEnabled")]
    m_wvc_init = m_idx[("Landroid/webkit/WebViewClient;", ("V", ()), "<init>")]
    m_set_wvc = m_idx[("Landroid/webkit/WebView;", ("V", ("Landroid/webkit/WebViewClient;",)), "setWebViewClient")]
    m_load_url = m_idx[("Landroid/webkit/WebView;", ("V", ("Ljava/lang/String;",)), "loadUrl")]

    t_wv = t_idx["Landroid/webkit/WebView;"]
    t_wvc = t_idx["Landroid/webkit/WebViewClient;"]
    s_url = s_idx[APP_URL]

    oncreate_insns = b"".join(
        [
            struct.pack("<BBHH", 0x6F, 0x20, m_super_oncreate, 0x0043),
            struct.pack("<BBH", 0x22, 0x00, t_wv),
            struct.pack("<BBHH", 0x70, 0x20, m_wv_init, 0x0030),
            struct.pack("<BBHH", 0x6E, 0x10, m_wv_settings, 0x0000),
            struct.pack("<BB", 0x0C, 0x01),
            struct.pack("<BB", 0x12, 0x12),
            struct.pack("<BBHH", 0x6E, 0x20, m_set_js, 0x0021),
            struct.pack("<BBHH", 0x6E, 0x20, m_set_dom, 0x0021),
            struct.pack("<BBH", 0x22, 0x01, t_wvc),
            struct.pack("<BBHH", 0x70, 0x10, m_wvc_init, 0x0001),
            struct.pack("<BBHH", 0x6E, 0x20, m_set_wvc, 0x0010),
            struct.pack("<BBHH", 0x6E, 0x20, m_set_content, 0x0003),
            struct.pack("<BBH", 0x1A, 0x01, s_url),
            struct.pack("<BBHH", 0x6E, 0x20, m_load_url, 0x0010),
            struct.pack("<BB", 0x0E, 0x00),
        ]
    )
    oncreate_code_item = struct.pack(
        "<HHHHII",
        5,
        2,
        2,
        0,
        0,
        len(oncreate_insns) // 2,
    ) + oncreate_insns

    header_size = 0x70
    string_ids_off = header_size
    string_ids_size = len(raw_strings)
    type_ids_off = string_ids_off + string_ids_size * 4
    type_ids_size = len(type_strs)
    proto_ids_off = type_ids_off + type_ids_size * 4
    proto_ids_size = len(protos_sorted)
    method_ids_off = proto_ids_off + proto_ids_size * 12
    method_ids_size = len(methods_sorted)
    class_defs_off = method_ids_off + method_ids_size * 8
    class_defs_size = 1

    data_off = class_defs_off + class_defs_size * 32
    data_buf = bytearray()

    def align4():
        while (data_off + len(data_buf)) % 4 != 0:
            data_buf.append(0)

    proto_param_offs = []
    type_list_count = 0
    first_type_list_off = 0
    for _, _, params in protos_sorted:
        if not params:
            proto_param_offs.append(0)
        else:
            align4()
            off = data_off + len(data_buf)
            if first_type_list_off == 0:
                first_type_list_off = off
            proto_param_offs.append(off)
            type_list_count += 1
            data_buf += struct.pack("<I", len(params))
            for p_str in params:
                data_buf += struct.pack("<H", t_idx[p_str])

    align4()
    code_item_start_off = data_off + len(data_buf)
    init_code_off = code_item_start_off
    data_buf += init_code_item
    align4()
    oncreate_code_off = data_off + len(data_buf)
    data_buf += oncreate_code_item

    string_data_offs = []
    for s in raw_strings:
        off = data_off + len(data_buf)
        string_data_offs.append(off)
        utf8_bytes = s.encode("utf-8")
        data_buf += uleb128(len(s)) + utf8_bytes + b"\x00"

    class_data_off = data_off + len(data_buf)
    m_main_init = m_idx[("Lcom/goldrix/platform/MainActivity;", ("V", ()), "<init>")]
    m_main_oncreate = m_idx[("Lcom/goldrix/platform/MainActivity;", ("V", ("Landroid/os/Bundle;",)), "onCreate")]

    class_data_bytes = (
        uleb128(0)
        + uleb128(0)
        + uleb128(1)
        + uleb128(1)
        + uleb128(m_main_init)
        + uleb128(0x10001)
        + uleb128(init_code_off)
        + uleb128(m_main_oncreate)
        + uleb128(0x0004)
        + uleb128(oncreate_code_off)
    )
    data_buf += class_data_bytes

    align4()
    map_off = data_off + len(data_buf)
    map_items = [
        (0x0000, 1, 0),
        (0x0001, string_ids_size, string_ids_off),
        (0x0002, type_ids_size, type_ids_off),
        (0x0003, proto_ids_size, proto_ids_off),
        (0x0005, method_ids_size, method_ids_off),
        (0x0006, class_defs_size, class_defs_off),
        (0x1001, type_list_count, first_type_list_off),
        (0x2001, 2, code_item_start_off),
        (0x2002, string_ids_size, string_data_offs[0]),
        (0x2000, 1, class_data_off),
        (0x1000, 1, map_off),
    ]
    data_buf += struct.pack("<I", len(map_items))
    for m_type, m_size, m_offset in map_items:
        data_buf += struct.pack("<HHII", m_type, 0, m_size, m_offset)

    align4()
    file_size = data_off + len(data_buf)
    data_size = len(data_buf)

    string_ids_bytes = b"".join(struct.pack("<I", o) for o in string_data_offs)
    type_ids_bytes = b"".join(struct.pack("<I", s_idx[t]) for t in type_strs)
    proto_ids_bytes = b"".join(
        struct.pack("<III", s_idx[p[0]], t_idx[p[1]], proto_param_offs[i])
        for i, p in enumerate(protos_sorted)
    )
    method_ids_bytes = b"".join(
        struct.pack("<HHI", t_idx[m[0]], p_idx[m[1]], s_idx[m[2]])
        for m in methods_sorted
    )
    class_def_bytes = struct.pack(
        "<IIIIIIII",
        t_idx["Lcom/goldrix/platform/MainActivity;"],
        0x0001,
        t_idx["Landroid/app/Activity;"],
        0,
        0xFFFFFFFF,
        0,
        class_data_off,
        0,
    )

    header_prefix = b"dex\n035\x00"
    header_rest = struct.pack(
        "<IIIIIIIIIIIIIIIIIIII",
        file_size,
        header_size,
        0x12345678,
        0,
        0,
        map_off,
        string_ids_size,
        string_ids_off,
        type_ids_size,
        type_ids_off,
        proto_ids_size,
        proto_ids_off,
        0,
        0,
        method_ids_size,
        method_ids_off,
        class_defs_size,
        class_defs_off,
        data_size,
        data_off,
    )

    body_after_sig = (
        header_rest
        + string_ids_bytes
        + type_ids_bytes
        + proto_ids_bytes
        + method_ids_bytes
        + class_def_bytes
        + bytes(data_buf)
    )

    sha1_digest = hashlib.sha1(body_after_sig).digest()
    adler32_val = zlib.adler32(sha1_digest + body_after_sig) & 0xFFFFFFFF

    return header_prefix + struct.pack("<I", adler32_val) + sha1_digest + body_after_sig


# ============================================================================
# 3. APK SIGNATURE SCHEME v1 (JAR) + v2 (APK Sig Block 42) GENERATOR
# ============================================================================
def compute_apk_v2_chunk_digest(data: bytes) -> list[bytes]:
    chunk_size = 1024 * 1024
    chunk_digests = []
    offset = 0
    total = len(data)
    while offset < total:
        chunk = data[offset : offset + chunk_size]
        h = hashlib.sha256()
        h.update(b"\xa5" + struct.pack("<I", len(chunk)))
        h.update(chunk)
        chunk_digests.append(h.digest())
        offset += chunk_size
    return chunk_digests


def build_signed_apk(output_path: str):
    manifest_xml = build_axml()
    resources_arsc = build_arsc()
    classes_dex = build_dex()

    icon_path = os.path.join(os.path.dirname(__file__), "..", "public", "pwa-192x192.png")
    with open(icon_path, "rb") as f:
        icon_png = f.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        key_pem = os.path.join(tmpdir, "key.pem")
        cert_pem = os.path.join(tmpdir, "cert.pem")
        cert_der = os.path.join(tmpdir, "cert.der")

        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                key_pem,
                "-out",
                cert_pem,
                "-days",
                "10000",
                "-subj",
                "/CN=GOLDRIX Quantitative Platform/O=GOLDRIX/C=US",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            ["openssl", "x509", "-in", cert_pem, "-outform", "DER", "-out", cert_der],
            check=True,
        )
        with open(cert_der, "rb") as f:
            cert_der_bytes = f.read()

        # Prepare v1 JAR Signature files (META-INF/MANIFEST.MF, CERT.SF, CERT.RSA)
        files = [
            ("AndroidManifest.xml", manifest_xml),
            ("resources.arsc", resources_arsc),
            ("classes.dex", classes_dex),
            ("res/drawable/icon.png", icon_png),
        ]

        manifest_lines = [
            "Manifest-Version: 1.0",
            "Created-By: 1.0 (Android)",
            "",
        ]
        sf_entry_blocks = []

        for fname, fbytes in files:
            sha256_b64 = base64.b64encode(hashlib.sha256(fbytes).digest()).decode("ascii")
            entry_text = f"Name: {fname}\r\nSHA-256-Digest: {sha256_b64}\r\n\r\n"
            manifest_lines.append(entry_text.rstrip("\r\n"))
            manifest_lines.append("")
            entry_sha256_b64 = base64.b64encode(
                hashlib.sha256(entry_text.encode("utf-8")).digest()
            ).decode("ascii")
            sf_entry_blocks.append(
                f"Name: {fname}\r\nSHA-256-Digest: {entry_sha256_b64}\r\n\r\n"
            )

        manifest_mf_bytes = ("\r\n".join(manifest_lines)).encode("utf-8")
        mf_sha256_b64 = base64.b64encode(
            hashlib.sha256(manifest_mf_bytes).digest()
        ).decode("ascii")

        cert_sf_header = (
            "Signature-Version: 1.0\r\n"
            "Created-By: 1.0 (Android)\r\n"
            f"SHA-256-Digest-Manifest: {mf_sha256_b64}\r\n"
            "X-Android-APK-Signed: 2\r\n\r\n"
        )
        cert_sf_bytes = (cert_sf_header + "".join(sf_entry_blocks)).encode("utf-8")

        sf_path = os.path.join(tmpdir, "CERT.SF")
        rsa_path = os.path.join(tmpdir, "CERT.RSA")
        with open(sf_path, "wb") as f:
            f.write(cert_sf_bytes)

        subprocess.run(
            [
                "openssl",
                "cms",
                "-sign",
                "-binary",
                "-noattr",
                "-in",
                sf_path,
                "-signer",
                cert_pem,
                "-inkey",
                key_pem,
                "-outform",
                "DER",
                "-out",
                rsa_path,
                "-md",
                "sha256",
            ],
            check=True,
        )
        with open(rsa_path, "rb") as f:
            cert_rsa_bytes = f.read()

        all_entries = [
            ("AndroidManifest.xml", manifest_xml, True),
            ("resources.arsc", resources_arsc, False),  # Uncompressed & 4-byte aligned
            ("classes.dex", classes_dex, False),        # Uncompressed & 4-byte aligned
            ("res/drawable/icon.png", icon_png, False), # Uncompressed & 4-byte aligned
            ("META-INF/MANIFEST.MF", manifest_mf_bytes, True),
            ("META-INF/CERT.SF", cert_sf_bytes, True),
            ("META-INF/CERT.RSA", cert_rsa_bytes, True),
        ]

        local_records = bytearray()
        cd_records = bytearray()

        for fname, raw_data, compress in all_entries:
            fname_bytes = fname.encode("utf-8")
            crc = zlib.crc32(raw_data) & 0xFFFFFFFF
            uncomp_size = len(raw_data)

            if compress:
                c_obj = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS)
                comp_data = c_obj.compress(raw_data) + c_obj.flush()
                method = 8
            else:
                comp_data = raw_data
                method = 0

            comp_size = len(comp_data)
            local_header_offset = len(local_records)

            extra = b""
            if method == 0:
                data_start = local_header_offset + 30 + len(fname_bytes)
                pad = (4 - (data_start % 4)) % 4
                if pad > 0:
                    extra = b"\x00" * pad

            lfh = struct.pack(
                "<IHHHHHIIIHH",
                0x04034B50,
                20,
                0,
                method,
                0,
                0x21,
                crc,
                comp_size,
                uncomp_size,
                len(fname_bytes),
                len(extra),
            )
            local_records += lfh + fname_bytes + extra + comp_data

            cdh = struct.pack(
                "<IHHHHHHIIIHHHHHII",
                0x02014B50,
                20,
                20,
                0,
                method,
                0,
                0x21,
                crc,
                comp_size,
                uncomp_size,
                len(fname_bytes),
                0,
                0,
                0,
                0,
                0,
                local_header_offset,
            )
            cd_records += cdh + fname_bytes

        eocd_for_digest = struct.pack(
            "<IHHHHIIH",
            0x06054B50,
            0,
            0,
            len(all_entries),
            len(all_entries),
            len(cd_records),
            len(local_records),
            0,
        )

        chunk_digests = (
            compute_apk_v2_chunk_digest(bytes(local_records))
            + compute_apk_v2_chunk_digest(bytes(cd_records))
            + compute_apk_v2_chunk_digest(eocd_for_digest)
        )
        top_hash = hashlib.sha256()
        top_hash.update(b"\x5a" + struct.pack("<I", len(chunk_digests)))
        for d in chunk_digests:
            top_hash.update(d)
        apk_v2_digest = top_hash.digest()

        def lp_bytes(b: bytes) -> bytes:
            return struct.pack("<I", len(b)) + b

        SIG_ALGO_RSA_PKCS1_V1_5_SHA256 = 0x0103

        digest_entry = lp_bytes(
            struct.pack("<I", SIG_ALGO_RSA_PKCS1_V1_5_SHA256) + lp_bytes(apk_v2_digest)
        )
        digests_seq = lp_bytes(digest_entry)
        certs_seq = lp_bytes(lp_bytes(cert_der_bytes))
        additional_attrs_seq = lp_bytes(b"")

        signed_data_bytes = digests_seq + certs_seq + additional_attrs_seq

        sd_path = os.path.join(tmpdir, "signed_data.bin")
        sig_path = os.path.join(tmpdir, "sig.bin")
        pub_der_path = os.path.join(tmpdir, "pub.der")

        with open(sd_path, "wb") as f:
            f.write(signed_data_bytes)

        subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_pem, "-out", sig_path, sd_path],
            check=True,
        )
        subprocess.run(
            ["openssl", "rsa", "-in", key_pem, "-pubout", "-outform", "DER", "-out", pub_der_path],
            check=True,
        )

        with open(sig_path, "rb") as f:
            rsa_sig_bytes = f.read()
        with open(pub_der_path, "rb") as f:
            pub_key_der_bytes = f.read()

        signature_entry = lp_bytes(
            struct.pack("<I", SIG_ALGO_RSA_PKCS1_V1_5_SHA256) + lp_bytes(rsa_sig_bytes)
        )
        signatures_seq = lp_bytes(signature_entry)

        signer_block = lp_bytes(
            lp_bytes(signed_data_bytes) + signatures_seq + lp_bytes(pub_key_der_bytes)
        )
        signers_seq = lp_bytes(signer_block)

        v2_pair_payload = struct.pack("<I", 0x7109871A) + signers_seq
        v2_pair = struct.pack("<Q", len(v2_pair_payload)) + v2_pair_payload

        block_size_field = len(v2_pair) + 8 + 16
        apk_signing_block = (
            struct.pack("<Q", block_size_field)
            + v2_pair
            + struct.pack("<Q", block_size_field)
            + b"APK Sig Block 42"
        )

        new_cd_offset = len(local_records) + len(apk_signing_block)
        final_eocd = struct.pack(
            "<IHHHHIIH",
            0x06054B50,
            0,
            0,
            len(all_entries),
            len(all_entries),
            len(cd_records),
            new_cd_offset,
            0,
        )

        final_apk = bytes(local_records) + apk_signing_block + bytes(cd_records) + final_eocd

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(final_apk)

        print(f"[APK Builder] Successfully built signed APK with resources.arsc & icon: {output_path} ({len(final_apk)} bytes)")


if __name__ == "__main__":
    default_out = os.path.join(os.path.dirname(__file__), "..", "public", "GOLDRIX.apk")
    out_file = sys.argv[2] if len(sys.argv) > 2 else default_out
    build_signed_apk(os.path.abspath(out_file))
