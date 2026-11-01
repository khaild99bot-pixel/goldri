/**
 * GOLDRIX Frontend API Client Service
 */

const API_BASE = '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const restoreToken = params.get('restore_session');
        if (restoreToken && restoreToken.startsWith('grd.')) {
          localStorage.setItem('goldrix_member_token', restoreToken);
          params.delete('restore_session');
          const cleanQuery = params.toString();
          const nextUrl =
            window.location.pathname +
            (cleanQuery ? `?${cleanQuery}` : '') +
            window.location.hash;
          window.history.replaceState({}, '', nextUrl);
        }
      } catch {
        // ignore URL parsing error
      }
    }
    const saved = localStorage.getItem('goldrix_member_token');
    if (saved && saved.startsWith('grd.')) {
      this.token = saved;
    } else {
      this.token = null;
      localStorage.removeItem('goldrix_member_token');
    }
  }

  public setToken(token: string | null) {
    if (token && token.startsWith('grd.')) {
      this.token = token;
      localStorage.setItem('goldrix_member_token', token);
    } else {
      this.token = null;
      localStorage.removeItem('goldrix_member_token');
      localStorage.removeItem('goldrix_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 4): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        cache: 'no-store',
        credentials: 'same-origin',
        headers,
      });
    } catch (netErr: any) {
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return this.request<T>(endpoint, options, retryCount - 1);
      }
      throw new Error('تعذر الاتصال بالخادم حالياً، يرجى المحاولة مرة أخرى بعد لحظات.');
    }

    const rawText = await response.text();
    const trimmed = rawText.trim();

    let data: any = {};
    if (trimmed) {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          throw new Error(`Invalid JSON response from server (HTTP ${response.status})`);
        }
      } else {
        // Server or proxy returned HTML/text (e.g. during container warm-up/restart) — request never reached Express JSON handler
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          return this.request<T>(endpoint, options, retryCount - 1);
        }
        if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
          throw new Error(
            'أنت تتصفح نسخة قديمة مخزنة. يرجى فتح الرابط السحابي الجديد للمنصة لتسجيل الدخول.'
          );
        }
        throw new Error(
          'جاري تنشيط اتصال السيرفر، يرجى الضغط على تسجيل الدخول مرة أخرى الآن.'
        );
      }
    }

    if (!response.ok) {
      if ((response.status === 502 || response.status === 503 || response.status === 504) && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return this.request<T>(endpoint, options, retryCount - 1);
      }
      throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth
  public login(emailOrPhone: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
  }

  public register(data: {
    email?: string;
    phone?: string;
    password: string;
    fullName: string;
    country?: string;
    countryCode?: string;
    dialCode?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    language?: string;
    referredBy?: string;
    otpCode?: string;
  }) {
    return this.request<{ token: string; user: any; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public getMe() {
    return this.request<{ user: any; balances: any; token?: string }>('/auth/me');
  }

  public changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; token?: string; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  public toggle2FA() {
    return this.request<{ twoFactorEnabled: boolean }>('/auth/toggle-2fa', {
      method: 'POST',
    });
  }

  public updateProfile(data: {
    fullName?: string;
    email?: string;
    phone?: string;
    country?: string;
    countryCode?: string;
    dialCode?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    language?: string;
    avatarUrl?: string;
  }) {
    return this.request<{ user: any; message?: string }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public detectCountry() {
    return this.request<{ countryCode: string | null }>('/geo/detect');
  }

  public sendEmailVerificationCode(email: string, isResend = false) {
    return this.request<{
      success: boolean;
      requiresOtp?: boolean;
      email: string;
      deliveredVia: string;
      instantCode?: string;
      expiresInSeconds: number;
      cooldownSeconds: number;
      sendCount: number;
      maxSends: number;
      remainingSends: number;
      maxVerifyAttempts: number;
      message: string;
    }>('/email/send-code', {
      method: 'POST',
      body: JSON.stringify({ email, isResend }),
    });
  }

  public async sendPasswordResetCode(email: string, isResend = false) {
    try {
      return await this.request<{
        success: boolean;
        email: string;
        deliveredVia: string;
        expiresInSeconds: number;
        cooldownSeconds: number;
        sendCount: number;
        maxSends: number;
        remainingSends: number;
        maxVerifyAttempts: number;
        message: string;
      }>('/auth/forgot-password/send-code', {
        method: 'POST',
        body: JSON.stringify({ email, isResend }),
      });
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('404') || msg.includes('not found') || msg.includes('تنشيط')) {
        return await this.request<{
          success: boolean;
          email: string;
          deliveredVia: string;
          expiresInSeconds: number;
          cooldownSeconds: number;
          sendCount: number;
          maxSends: number;
          remainingSends: number;
          maxVerifyAttempts: number;
          message: string;
        }>('/email/send-code', {
          method: 'POST',
          body: JSON.stringify({ email, isResend, forPasswordReset: true }),
        });
      }
      throw err;
    }
  }

  public async resetPasswordWithOtp(data: { email: string; code: string; newPassword: string }) {
    try {
      return await this.request<{
        success: boolean;
        token: string;
        user: any;
        message: string;
      }>('/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('404') || msg.includes('not found') || msg.includes('تنشيط')) {
        return await this.request<{
          success: boolean;
          token: string;
          user: any;
          message: string;
        }>('/email/verify-code', {
          method: 'POST',
          body: JSON.stringify({ ...data, forPasswordReset: true }),
        });
      }
      throw err;
    }
  }

  public verifyEmailCode(data: { email: string; code: string }) {
    return this.request<{
      success: boolean;
      verified: boolean;
      email: string;
      remainingAttempts?: number;
      user?: any;
      message: string;
    }>('/email/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public sendPhoneVerificationCode(phone: string) {
    return this.request<{
      success: boolean;
      phone: string;
      deliveredVia?: string;
      expiresInSeconds?: number;
      cooldownSeconds?: number;
      sendCount?: number;
      maxSends?: number;
      remainingSends?: number;
      maxVerifyAttempts?: number;
      message: string;
    }>('/phone/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  public verifyPhoneCode(data: {
    phone: string;
    code: string;
    country?: string;
    countryCode?: string;
    dialCode?: string;
  }) {
    return this.request<{
      success: boolean;
      verified: boolean;
      phone: string;
      remainingAttempts?: number;
      user?: any;
      message: string;
    }>('/phone/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // KYC
  public getKYCStatus(complete = false) {
    return this.request<{ kycStatus: string; submission: any; serverNow?: string }>(
      `/kyc/status${complete ? '?complete=1' : ''}`
    );
  }

  public submitKYC(data: {
    fullName?: string;
    documentType: string;
    documentNumber?: string;
    country: string;
    dateOfBirth: string;
    frontFileName?: string;
    frontFileDataUrl?: string;
    backFileName?: string;
    backFileDataUrl?: string;
    fileName?: string;
    fileDataUrl?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      submission: any;
      autoApproveAt?: string;
      processingDurationSeconds?: number;
    }>('/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Markets
  public getMarkets() {
    return this.request<any[]>('/markets');
  }

  public getCandles(symbol: string) {
    return this.request<{ symbol: string; candles: any[] }>(`/markets/${encodeURIComponent(symbol)}/candles`);
  }

  // Plans & Investments
  public getInvestmentPlans() {
    return this.request<any[]>('/investment-plans');
  }

  public getUserInvestments() {
    return this.request<any[]>('/investments');
  }

  public activateInvestment(planId: string, amount: string | number) {
    return this.request<{ success: boolean; investment: any; transaction: any; balances: any }>('/investments/activate', {
      method: 'POST',
      body: JSON.stringify({ planId, amount }),
    });
  }

  // Balances & Transactions
  public getBalanceSummary() {
    return this.request<any>('/assets/summary');
  }

  public getTransactions(params?: { asset?: string; type?: string }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/transactions${q ? `?${q}` : ''}`);
  }

  // Deposits
  public getDeposits() {
    return this.request<any[]>('/deposits');
  }

  public generateDepositAddress(asset: string, network: string) {
    return this.request<{
      asset: string;
      network: string;
      address: string;
      minDeposit: string;
      requiredConfirmations: number;
      instructions: string;
    }>('/deposits/generate-address', {
      method: 'POST',
      body: JSON.stringify({ asset, network }),
    });
  }

  public confirmTestDeposit(asset: string, network: string, amount: string | number) {
    return this.request<{ success: boolean; deposit: any; transaction: any; balances: any }>('/deposits/confirm-test', {
      method: 'POST',
      body: JSON.stringify({ asset, network, amount }),
    });
  }

  public submitDepositNotification(asset: string, network: string, amount: string | number, txHash?: string) {
    return this.request<{ success: boolean; deposit: any }>('/deposits/submit-notification', {
      method: 'POST',
      body: JSON.stringify({ asset, network, amount, txHash }),
    });
  }

  // Withdrawals
  public getWithdrawals() {
    return this.request<any[]>('/withdrawals');
  }

  public requestWithdrawal(asset: string, network: string, destinationAddress: string, amount: string | number) {
    return this.request<{ success: boolean; withdrawal: any; transaction: any; balances: any }>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify({ asset, network, destinationAddress, amount }),
    });
  }

  // Notifications
  public getNotifications() {
    return this.request<any[]>('/notifications');
  }

  public markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  }

  public markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'POST' });
  }

  // Support
  public getSupportTickets() {
    return this.request<any[]>('/support/tickets');
  }

  public createSupportTicket(subject: string, category: string, priority: string, message: string) {
    return this.request<any>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, category, priority, message }),
    });
  }

  public replySupportTicket(id: string, content: string) {
    return this.request<any>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Admin
  public getAdminOverview() {
    return this.request<any>('/admin/overview');
  }

  public getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  public updateAdminUserStatus(userId: string, status: string, reason?: string) {
    return this.request<any>(`/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  }

  public getAdminKYCQueue() {
    return this.request<any[]>('/admin/kyc-queue');
  }

  public reviewAdminKYC(id: string, status: string, adminNotes?: string) {
    return this.request<any>(`/admin/kyc/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, adminNotes }),
    });
  }

  public getAdminWithdrawals() {
    return this.request<any[]>('/admin/withdrawals');
  }

  public approveAdminWithdrawal(id: string, txHash?: string) {
    return this.request<any>(`/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
  }

  public rejectAdminWithdrawal(id: string, reason: string) {
    return this.request<any>(`/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public getAdminDeposits() {
    return this.request<any[]>('/admin/deposits');
  }

  public approveAdminDeposit(
    id: string,
    details?: {
      userId?: string;
      amount?: string | number;
      asset?: string;
      network?: string;
      userFullName?: string;
      userEmail?: string;
      userPhone?: string;
    }
  ) {
    return this.request<any>(`/admin/deposits/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(details || {}),
    });
  }

  public rejectAdminDeposit(id: string, reason: string = 'لم يتم التحقق من الحوالة') {
    return this.request<any>(`/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public adjustAdminUserBalance(
    userId: string,
    data: { mode: 'CREDIT' | 'DEBIT' | 'RESET'; amount?: string | number; reason?: string }
  ) {
    return this.request<{ success: boolean; newBalanceUSDT: string }>(`/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public creditAdminDeposit(data: { userId: string; asset?: string; network?: string; amount: string | number; txHash?: string }) {
    return this.request<any>('/admin/deposits/credit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public createAdminPlan(plan: any) {
    return this.request<any>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  public updateAdminPlan(id: string, plan: any) {
    return this.request<any>(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  }

  public getAdminAuditLogs() {
    return this.request<any[]>('/admin/audit-logs');
  }

  public getAdminSystemSettings() {
    return this.request<any>('/admin/system-settings');
  }

  public updateAdminSystemSettings(settings: any) {
    return this.request<any>('/admin/system-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public adminRecoverMemberSessions() {
    return this.request<{
      success: boolean;
      recoveredUsersCount: number;
      recoveredDepositsCount: number;
      totalMembersCount: number;
      message: string;
    }>('/admin/users/recover-sessions', {
      method: 'POST',
    });
  }

  public adminGenerateMemberSessionLink(userId: string) {
    return this.request<{
      success: boolean;
      token: string;
      userId: string;
      fullName: string;
      email: string;
    }>(`/admin/users/${encodeURIComponent(userId)}/session-link`, {
      method: 'POST',
    });
  }

  // Trading Bots
  public getBots() {
    return this.request<import('../types/index.ts').TradingBot[]>('/bots');
  }

  public updateBotStatus(botId: string, status: 'ACTIVE' | 'PAUSED' | 'STOPPED') {
    return this.request<{ success: boolean; bot: import('../types/index.ts').TradingBot }>(`/bots/${botId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Referral Program
  public getReferralSummary() {
    return this.request<{
      referralCode: string;
      referralLink: string;
      ruleDepositBonusUSDT: number;
      ruleMinDepositUSDT: number;
      ruleProfitSharePercent: number;
      totalInvited: number;
      totalEarningsUSDT: string;
      totalProfitShareUSDT: string;
      totalCombinedUSDT: string;
      invitees: Array<{
        id: string;
        name: string;
        maskedEmail: string;
        phone?: string;
        joinedAt: string;
        status: string;
        totalInvestedUSDT: string;
        totalRealizedPnlUSDT: string;
        directBonusUSDT: string;
        profitShareUSDT: string;
        activeInvestmentsCount: number;
      }>;
      bonusHistory: Array<{
        id: string;
        type: string;
        amount: string;
        asset: string;
        description: string;
        timestamp: string;
        status: string;
      }>;
    }>('/referrals/summary');
  }

  public simulateReferralInvestment(amount: number = 100) {
    return this.request<{
      success: boolean;
      bonusAwardedUSDT: string;
      commissionAwardedUSDT: string;
      inviteeName: string;
      summary: any;
      balances: any;
    }>('/referrals/simulate-investment', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // AI Assistant Chatbot
  public sendChatMessage(message: string) {
    return this.request<{ reply: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Admin OTP & Verification Management
  public getAdminVerificationCodes() {
    return this.request<any[]>('/admin/verification-codes');
  }

  public verifyAdminUserContact(userId: string, channel: 'EMAIL' | 'PHONE' | 'BOTH') {
    return this.request<{ success: boolean; user: any }>(`/admin/users/${userId}/verify-contact`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  }

  // Firebase Auth & Cloud Account Link
  public loginWithFirebase(data: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }) {
    return this.request<{ token: string; user: any; balances: any; message: string }>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Resend Email Receiver & Message Center
  public getEmailMessages() {
    return this.request<{
      messages: import('../types/index.ts').EmailMessageRecord[];
      resendNotifyEmail: string;
      systemResendEmail: string;
      senderEmail: string;
    }>('/email/messages');
  }

  public updateEmailReceiverConfig(data: { resendNotifyEmail: string; smtpFrom?: string }) {
    return this.request<{
      success: boolean;
      user: any;
      resendNotifyEmail: string;
      message: string;
    }>('/email/receiver-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public sendTestResendEmail(email?: string) {
    return this.request<{
      success: boolean;
      delivered: boolean;
      provider: string;
      email: string;
      messageRecord?: import('../types/index.ts').EmailMessageRecord;
      message: string;
    }>('/email/test-resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Admin Server Control & Telemetry
  public getAdminServerStatus() {
    return this.request<any>('/admin/server-status');
  }

  public runAdminServerAction(action: 'FORCE_SAVE_DB' | 'RECONCILE_YIELDS' | 'CLEAR_EXPIRED_OTPS' | 'REFRESH_MARKET_PRICES') {
    return this.request<{
      success: boolean;
      action: string;
      message: string;
      timestamp: string;
    }>('/admin/server-action', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  public getAdminServerBackup() {
    return this.request<any>('/admin/server-backup');
  }

  public getAdminBundle() {
    return this.request<{
      overview: any;
      users: any[];
      kycQueue: any[];
      withdrawals: any[];
      deposits: any[];
      plans: any[];
      auditLogs: any[];
      systemSettings: any;
      verificationCodes: any[];
    }>('/admin/bundle');
  }
}

export const api = new ApiService();
