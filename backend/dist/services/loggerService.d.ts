interface LogContext {
    [key: string]: any;
}
export declare function logError(err: Error | string, context?: LogContext): void;
export declare function logWarn(msg: string, context?: LogContext): void;
export declare function logInfo(msg: string, context?: LogContext): void;
declare const _default: {
    logError: typeof logError;
    logWarn: typeof logWarn;
    logInfo: typeof logInfo;
};
export default _default;
//# sourceMappingURL=loggerService.d.ts.map