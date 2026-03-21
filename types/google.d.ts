/** Minimal type declarations for Google Picker API and GIS (loaded via script tags). */

declare namespace google {
  namespace accounts.oauth2 {
    interface TokenResponse {
      access_token: string;
      error?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
    }
    interface TokenClientConfig {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
    }
    interface TokenClient {
      requestAccessToken(options?: { prompt?: string }): void;
    }
    function initTokenClient(config: TokenClientConfig): TokenClient;
  }

  namespace picker {
    enum Action {
      PICKED = 'picked',
      CANCEL = 'cancel',
    }
    enum Feature {
      MULTISELECT_ENABLED = 'multiselectEnabled',
    }
    interface DocumentObject {
      id: string;
      name: string;
      mimeType: string;
      url: string;
      [key: string]: unknown;
    }
    interface ResponseObject {
      action: Action | string;
      docs: DocumentObject[];
      [key: string]: unknown;
    }
    class DocsView {
      constructor(viewId?: string);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
    }
    class PickerBuilder {
      addView(view: DocsView): PickerBuilder;
      enableFeature(feature: Feature): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setAppId(appId: string): PickerBuilder;
      setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
      build(): Picker;
    }
    interface Picker {
      setVisible(visible: boolean): void;
    }
  }
}

declare function gapi_load(api: string, callback: () => void): void;
declare namespace gapi {
  function load(api: string, callback: () => void): void;
}
