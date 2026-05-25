import '@wxt-dev/browser';

declare module '@wxt-dev/browser' {
  namespace Browser {
    namespace tabs {
      interface Tab {
        cookieStoreId?: string;
      }
      interface UpdateProperties {
        cookieStoreId?: string;
      }
      interface CreateProperties {
        cookieStoreId?: string;
      }
      interface OnUpdatedInfo {
        status?: string;
      }
    }
    namespace contextualIdentities {
      interface ContextualIdentity {
        name: string;
        color: string;
        icon: string;
        cookieStoreId: string;
      }
      function create(details: {
        name: string;
        color?: string;
        icon?: string;
      }): Promise<ContextualIdentity>;
      function query(details: object): Promise<ContextualIdentity[]>;
      function update(
        cookieStoreId: string,
        details: { name?: string; color?: string; icon?: string }
      ): Promise<ContextualIdentity>;
      function remove(cookieStoreId: string): Promise<void>;
    }
  }
}
