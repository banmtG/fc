document.addEventListener('emitCartChange',handleIndexCartChange);

function handleIndexCartChange(e) {
   // console.log(e.detail);
    udpateTotalPriceAndItemCart(e.detail);
}

function udpateTotalPriceAndItemCart (value) {
    if (value.total==0) totalItem.classList.add('hidden');
    if (value.total>0) {
        totalItem.classList.remove('hidden');
        //checkoutItemsa =value.selectedItems;
    }
   // console.log(`udpateTotalPriceAndItemCart`);
    totalPrice.innerHTML = addDotToNumber(value.total);
    totalItem.innerHTML = value.selectedItems.length;    
}


view_cart.addEventListener('click', handleInitCheckoutList);

function handleInitCheckoutList() {
    const view_cart_Popup = document.createElement('div');
    view_cart_Popup.classList.add('view_cart_Popup');
    view_cart_Popup.innerHTML = `<div class="checkout_container"><checkout-list></checkout-list></div>`;
    
    document.body.appendChild(view_cart_Popup);
    const checkout_list = document.querySelector('checkout-list');
    checkout_list.classList.add('checkout-list');

    checkout_list.addEventListener('removeCheckout',(e)=> {
        view_cart_Popup.remove();  
        // album.setSelectedItems = JSON.parse(localStorage.getItem("selectedItems")).selectedItems;
    });    

    let items = StateStore.getState('itemSelectedList') ? StateStore.getState('itemSelectedList') : null;
    console.log(JSON.stringify(items));
    if (items!=null) checkout_list.items = {...items};

    view_cart_Popup.addEventListener('click',(e)=> {
        e.stopPropagation();   
        if (e.target === checkout_list) return;                
        view_cart_Popup.remove();  
    })
    //checkout_list.addEventListener('checkout_listChanged',handleCheckoutListChanged)
}


function handleInitContactForm() {
    const contact_Form_Popup = document.createElement('div');
    contact_Form_Popup.classList.add('contact_Form_Popup');
    contact_Form_Popup.innerHTML = `<div class="contact_form_container"><contact-form></contact-form></div>`;
    
    document.body.appendChild(contact_Form_Popup);
    console.log(contact_Form_Popup);
    const contact_form = document.querySelector('contact-form');
    contact_form.classList.add('contact_form'); 

    contact_form.addEventListener('removeContactForm',(e)=> {
        contact_Form_Popup.remove();  
        // album.setSelectedItems = JSON.parse(localStorage.getItem("selectedItems")).selectedItems;
    });  

    contact_Form_Popup.addEventListener('click',(e)=> {
        e.stopPropagation();   
        if (e.target === contact_form) return;                
        contact_Form_Popup.remove();  
    })

    let data = StateStore.getState('contact_form_data') ? StateStore.getState('contact_form_data') : null;
    console.log(JSON.stringify(data));
    if (data!=null) contact_form.contact_data = {...data};
    //contact_form.addEventListener('removeContactForm', )
}

function handleSendForm() {
    const capt_Popup = document.createElement('div');
    capt_Popup.classList.add('captcha_Popup');
    capt_Popup.innerHTML = `<captcha-component></captcha-component>`;
    
    document.body.appendChild(capt_Popup);

    const capt = document.querySelector('captcha-component');
    console.log(capt);

    capt.addEventListener('captchaVerified', (e)=> {
        console.log('verified', e.detail);
        setTimeout(()=>{
            capt_Popup.remove();

        },2000)        
    })

    capt_Popup.addEventListener('click',(e)=> {
        console.log(e.target);
        e.stopPropagation();   
        if (e.target === capt) return;                
        capt_Popup.remove();  
    })
}

// function handleRemoveContactForm() {

// }