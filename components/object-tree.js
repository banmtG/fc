{/* <object-tree data='{ "name": "John", "age": 30, "address": { "city": "New York", "zip": "10001" }, "hobbies": [ { "key1": "New York City", "key2": "The Locknet lake" }, "sports"] }'></object-tree>
const objTree = document.querySelector('object-tree');
objTree.renderTree(anObject); */}

class ObjectTree extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                ul {
                    list-style-type: none;
                    padding-left: 1em;
                    margin: 0;
                    border-left: 1px dashed #ccc;
                }
                li {
                    margin: 0.3em 0;
                    cursor: pointer;
                }
                li span {
                    font-weight: bold;
                }
                li.collapsed > ul {
                    display: none;
                }

                li.collapsed::after {
                    position:absolute;
                    content:"▼";  
                }

                .key {
                    text-decoration: underline;                                        
                }

                
            </style>
            <div class="tree-container"></div>
        `;
    }

    connectedCallback() {
        const objectData = this.getAttribute('data');
        if (objectData) {
            const parsedData = JSON.parse(objectData);
            this.renderTree(parsedData);
        }
    }

    renderTree(data) {
        const container = this.shadowRoot.querySelector('.tree-container');
        const stack = [{
            parent: container,
            key: null,
            value: data
        }];

        while (stack.length) {
            const { parent, key, value } = stack.pop();

            // Create the list item
            const li = document.createElement('li');

            if (key !== null) {
                li.innerHTML = `<span class="key">${key}:</span>`;
            }

            if (typeof value === 'object' && value !== null) {
                li.classList.add('collapsible');
                const ul = document.createElement('ul');
                li.appendChild(ul);
                stack.push(...Object.entries(value).reverse().map(([k, v]) => ({
                    parent: ul,
                    key: k,
                    value: v
                })));
            } else {
                li.innerHTML += ` <span>${value}</span>`;
            }

            parent.appendChild(li);

            // Add click event for toggling
            li.addEventListener('click', (e) => {
                if (li.classList.contains('collapsible')) {
                    li.classList.toggle('collapsed');
                }
                e.stopPropagation(); // Prevent click event from bubbling
            });
        }
    }
}

customElements.define('object-tree', ObjectTree);
