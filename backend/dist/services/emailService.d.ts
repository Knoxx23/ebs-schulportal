export declare function isEmailConfigured(): boolean;
export declare function sendInvitationEmail(parentEmail: string, childName: string, activationUrl: string, code: string): Promise<boolean>;
export declare function sendReturnNotification(parentEmail: string, childName: string, returnNote: string): Promise<boolean>;
export declare function sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean>;
export declare function sendApprovalNotification(parentEmail: string, childName: string): Promise<boolean>;
//# sourceMappingURL=emailService.d.ts.map