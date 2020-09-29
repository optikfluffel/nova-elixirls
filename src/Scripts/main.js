var langserver = null;

exports.activate = function() {
    // Do work when the extension is activated
    langserver = new ElixirLanguageServer();
    
    nova.workspace.onDidAddTextEditor((editor) => {
        let document = editor.document;
        
        if (!["elixir", "eex", "html+eex"].includes(document.syntax)) return;
        
        editor.onWillSave(() => {
            langserver.languageClient.sendNotification("textDocument/didSave", {
                textDocument: {
                    uri: document.uri
                }
            });
        });
    });
};

exports.deactivate = function() {
    // Clean up state before the extension is deactivated
    if (langserver) {
        langserver.deactivate();
        langserver = null;
    }
};

class ElixirLanguageServer {
    constructor() {
        this.start();
    }
 
    deactivate() {
        this.stop();
    }
    
    start() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
        }

        // Create the client
        var serverOptions = {
            path: nova.extension.path + "/elixir-ls-release/language_server.sh",
        };
        var clientOptions = {
            syntaxes: [
                "elixir",
                "html+eex",
                "eex"
            ]
        };
        var client = new LanguageClient("elixir", "Elixir Language Server", serverOptions, clientOptions);
        
        try {
            // Start the client
            client.start();
                        
            client.sendNotification("workspace/didChangeConfiguration", {
                settings: {
                    "elixirLS": {
                        "dialyzerEnabled": nova.config.get("elixirLS.dialyzerEnabled"),
                        "dialyzerFormat": nova.config.get("elixirLS.dialyzerFormat"),
                        "mixEnv": nova.config.get("elixirLS.mixEnv"),
                    }
                }
            });
            
            // Add the client to the subscriptions to be cleaned up
            nova.subscriptions.add(client);
            this.languageClient = client;
        }
        catch (err) {
            // If the .start() method throws, it's likely because the path to the language server is invalid
            
            if (nova.inDevMode()) {
                console.error(err);
            }
        }
    }
    
    stop() {
        if (this.languageClient) {
            this.languageClient.stop();
            nova.subscriptions.remove(this.languageClient);
            this.languageClient = null;
        }
    }
}

