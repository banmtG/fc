/**
 * AppController
 * ===========================================
 * Central orchestrator for web apps using custom components.
 *
 * Core responsibilities:
 * - 🧭 Listen to custom DOM events emitted by components
 * - 🔁 Route data/state updates across components
 * - 📦 Persist user/session state using LocalStorage
 * - 🧠 Sync with reactive state system (StateStore)
 *
 * This can be reused in any app with dynamic UI and web components.
 */
class AppController {
    constructor() {
        // ⚡ Boot the event system and restore session data
        this.initEventListeners();
        this.initialLoadStorage();
    }

    /**
     * Set up listeners for component-generated custom events.
     * These are dispatched globally via `document.dispatchEvent(...)`
     */
    initEventListeners() {
        // read event emitted from search-box
        document.addEventListener("searchBoxEvent_phrasesAdd", (e) => {
        const phrases = e.detail.phrases;
        console.log(phrases);
        //     StateStore.setState("pendingPhraseList", phrases);
            loadDefiFromServerPost(phrases).then(data => {
                const editor = document.querySelector("phrase-mobile-editor");
                console.log(editor);
                editor.phrases = data;
                console.log(data);
            //StateStore.setState("matchedPhrases", data);
        });
        });

        // read event emitted from loading-icon
        document.addEventListener("loadingIconEvent_finishLoading", (e) => {
            const loadingtime = e.detail.loadingtime;
            console.log(loadingtime);
        });


        // Example: Trigger next step in form flow
        /*
        document.addEventListener("checkout_fireNextStepEvent", (event) => {
            if (event.target.matches(".checkout-list")) {
                handleInitContactForm();
            }
        });
        */

        // Example: Update contact form state
        /*
        document.addEventListener("contact_form_Changed", (event) => {
            if (event.target.matches("contact-form")) {
                const contactData = event.detail.contactData;
                StateStore.setState("contact_form_data", contactData);
                LocalStorageManager.set("contact_form_data", contactData);
            }
        });
        */

        // Example: Final form submission trigger
        /*
        document.addEventListener("proceedContactForm", (event) => {
            if (event.target.matches("contact-form")) {
                handleSendForm();
                const contactData = event.detail.contactData;
                StateStore.setState("contact_form_data", contactData);
                LocalStorageManager.set("contact_form_data", contactData);
            }
        });
        */

        // Optional: Global state subscription example
        /*
        StateStore.subscribe((key, value) => {
            if (key.startsWith("user-")) {
                this.updateComponents(key, value);
            }
        });
        */
    }

    /**
     * Example state router used to sync component state updates
     * You could dispatch synthetic events or directly update components here
     */
    updateComponents(key, value) {
        /*
        const userDisplay = document.querySelector("web-component-a");
        if (userDisplay) {
            userDisplay.dispatchEvent(new CustomEvent("state-changed", {
                detail: { key, value }
            }));
        }
        */
    }

    /**
     * Custom dispatcher to broadcast cart changes app-wide
     * Accepts a CustomEvent with `detail` payload
     */
    emitCartChange(e) {
        /*
        const event = new CustomEvent("emitCartChange", {
            detail: e.detail
        });
        document.dispatchEvent(event);

        // Persist state across sessions
        StateStore.setState("itemSelectedList", e.detail);
        LocalStorageManager.set("itemSelectedList", e.detail);
        */
    }

    /**
     * Restore session data from LocalStorage into memory
     * Called during startup to hydrate the app's state
     */
    initialLoadStorage() {
        // Restore selected cart
        /*
        const itemData = LocalStorageManager.get("itemSelectedList");
        if (itemData) {
            StateStore.setState("itemSelectedList", itemData);
            album.setSelectedItems = itemData.selectedItems;
            udpateTotalPriceAndItemCart(itemData);
        }
        */

        // Restore contact form state
        /*
        const contactData = LocalStorageManager.get("contact_form_data");
        if (contactData) {
            StateStore.setState("contact_form_data", contactData);
        }
        */
    }
}

// ✅ Automatically initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new AppController();
});
