const GAS_Link = "https://script.google.com/macros/s/AKfycbyZ6JHUbgqcr2RPL2r1WZv2yjJfSGHZHon6x68Ba1ODMK9OTkdgiBGrdU1BJhbzE_VRYw/exec";

//https://script.google.com/home/projects/1_EB72AQ8PokpJ7Qct9wiCZpDIk5Jtcg8MfMd6Mdg86e2o7oH4C7i36qH/edit

async function loadDatafromServerPost(url, myPostDataObj) {
    LoadingOverlay.show();
    try {
        const response = await fetch(url,{
            method: 'POST',
            body: JSON.stringify(myPostDataObj)
        });

        const data = await response.json();
        return data;
    } catch (e) {
        console.log(`Error fetching data from server ${e}`);
    } finally {
        LoadingOverlay.hideWithDuration();
    }

}

async function handleDatafromServer() {
    var myPostDataObj = {
        'service': 'sheet2Array',
        'postedData': {
            sheetID : "17pLrxP2aEgHW9HIRiBgokmUF9EE2RSwfOIAYK_PEwRQ",
            tabName : "Data",
            columns : [1]
        }  
      }  

    const data = await loadDatafromServerPost("https://script.google.com/macros/s/AKfycbxNfJsmYq8DLHTFqc7EA652i9Y45qPl7hSMVLSx9SzAiMKRPcVG3oq0cGFweQBtVi8wnA/exec",myPostDataObj);
    console.log(data);
}


async function loadDefiFromServerPost(phrases) {
    console.log(phrases);
      var myPostDataObj = {
        action: 'searchPhrases',
        lang: "vi",
        phrases: phrases
      }  

    const data = await loadDatafromServerPost(GAS_Link,myPostDataObj);
    console.log(data);   
    return data; // 🔥 THIS must be returned
 
}
// handleDatafromServer();

async function loadDefinitionfromServer(url, wordList) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function loadDefinitionfromFreeServer(url, word) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

