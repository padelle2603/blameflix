package com.padelle.blameflix;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public MainActivity() {
        registerPlugin(BrowserChooserPlugin.class);
    }
}
