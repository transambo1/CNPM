const MODULE_NAME = 'native/NotificationCalendarCommand';

type ExpoGlobal = {
  modules?: Record<string, any>;
};

if (typeof globalThis !== 'undefined') {
  const globalScope = globalThis as typeof globalThis & { expo?: ExpoGlobal };
  const expoGlobal: ExpoGlobal = (globalScope.expo = globalScope.expo ?? {});
  const modules: Record<string, any> = (expoGlobal.modules = expoGlobal.modules ?? {});

  if (!modules[MODULE_NAME]) {
    const noop = (method: string) => (..._args: unknown[]) => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          `[notification-calendar] Native method "${method}" is not available on web. The call was ignored.`,
        );
      }
      return null;
    };

    modules[MODULE_NAME] = new Proxy(
      { name: 'NotificationCalendarCommand' },
      {
        get(target, property) {
          if (property in target) {
            return (target as any)[property];
          }
          if (property === Symbol.toStringTag) {
            return 'NotificationCalendarCommand';
          }
          return noop(String(property));
        },
      },
    );
  }
}

export {};
