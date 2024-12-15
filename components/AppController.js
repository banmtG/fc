class AppController {
    constructor() {
        this.initEventListeners();
        this.initialLoadStorage();
    }

    initEventListeners() {
        // Listen for custom events emitted by web components      
        album.addEventListener('itemSelected',this.emitCartChange.bind(this));  
             
        document.addEventListener("checkout_listChanged", (event) => {
            console.log(event);
            if (event.target.matches(".checkout-list")) {
                    album.setSelectedItems = event.detail.selectedItems;
                    this.emitCartChange(event);
                }

          //  StateStore.setState(`user-${userId}`, data);
        });

                   
        document.addEventListener("checkout_fireNextStepEvent", (event) => {
            if (event.target.matches(".checkout-list")) {
                   console.log(event);
                   handleInitContactForm();
                }   
          //  StateStore.setState(`user-${userId}`, data);
        });

                      
        document.addEventListener("contact_form_Changed", (event) => {
            if (event.target.matches("contact-form")) {
                   console.log(event.detail.contactData);

                // Update the application state
                StateStore.setState(`contact_form_data`, event.detail.contactData);

                // Persist the state if needed
                LocalStorageManager.set(`contact_form_data`, event.detail.contactData);
                }   
          //  StateStore.setState(`user-${userId}`, data);
        });

        document.addEventListener("proceedContactForm", (event) => {
            if (event.target.matches("contact-form")) {
                   console.log(event.detail.contactData);

                   handleSendForm();
                // Update the application state
                StateStore.setState(`contact_form_data`, event.detail.contactData);

                // Persist the state if needed
                LocalStorageManager.set(`contact_form_data`, event.detail.contactData);
                }   
          //  StateStore.setState(`user-${userId}`, data);
        });

        // document.addEventListener("itemS4545454elected", (event) => {
        //     console.log(event.detail);

            // // Update the application state
            // StateStore.setState(`contact_form`, event.detail.contactData);

            // // Persist the state if needed
            // LocalStorageManager.set(`contact_form`, event.detail.contactData);
        // });

        // Listen for other global events or state changes
        // StateStore.subscribe((key, value) => {
        //     if (key.startsWith("user-")) {
        //         this.updateComponents(key, value);
        //     }
        // });
    }

    // updateComponents(key, value) {
    //     // Example: Dynamically update a web component based on the state
    //     const userDisplay = document.querySelector("web-component-a");
    //     if (userDisplay) {
    //         userDisplay.dispatchEvent(new CustomEvent("state-changed", { 
    //             detail: { key, value } 
    //         }));
    //     }
    // }

    emitCartChange(e) {       
        const event = new CustomEvent('emitCartChange', {
            detail: e.detail
            });
        document.dispatchEvent(event);
       // console.log(e.detail);
        // Update the application state
        StateStore.setState(`itemSelectedList`, e.detail);

        // Persist the state if needed
        LocalStorageManager.set(`itemSelectedList`, e.detail);
    }    
    
    initialLoadStorage() {

        let itemSelectedList_data = LocalStorageManager.get(`itemSelectedList`) ?  LocalStorageManager.get(`itemSelectedList`) : null;
        if (itemSelectedList_data!=null){
            console.log(itemSelectedList_data);
            StateStore.setState(`itemSelectedList`, itemSelectedList_data);    
            album.setSelectedItems =itemSelectedList_data.selectedItems;
            udpateTotalPriceAndItemCart(itemSelectedList_data);
        }

        let contactForm_data = LocalStorageManager.get(`contact_form_data`) ?  LocalStorageManager.get(`contact_form_data`) : null;
        if (contactForm_data!=null){
            console.log(contactForm_data);
            StateStore.setState(`contact_form_data`, contactForm_data);    
            //album.setSelectedItems =itemSelectedList_data.selectedItems;
           //udpateTotalPriceAndItemCart(itemSelectedList_data);
        }


    }
}


// Initialize the AppController
document.addEventListener("DOMContentLoaded", () => {
    new AppController();
});
