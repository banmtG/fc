
function createAndSaveFile(content, fileName) {
    // Create a Blob with the file content
    const blob = new Blob([content], { type: 'text/plain' });

    // Create an <a> element with a download attribute
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;

    // Append the <a> element to the DOM
    document.body.appendChild(a);

    // Simulate a click on the <a> element to trigger the download
    a.click();

    // Remove the <a> element from the DOM
    document.body.removeChild(a);
    console.log('file save',fileName);
}

// fetch('./../data/Cambridge_41724.json')
//             .then(response => response.json())
//             .then(data => {
//                 console.log(data);
//                 //outputDiv.innerText = data;
//                 createAndSaveFile(JSON.stringify(data),'words.json')
//             })
//             .catch(error => {
//                 console.error('Error:', error);
//             });

export function aTestingFunctionToMakeModule () {
    console.log(hello);
}