let LOCAL_WLIST = [];

async function loadLocalData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

async function loadWLIST() {
    let temp =  await loadLocalData("./../data/Cambridge_41724.json");
    LOCAL_WLIST = temp.words;
}

loadWLIST();

function local_data_searchWLIST(arrayW) {
    let arrayT = [...arrayW];
    arrayT.sort((a, b) => a.localeCompare(b)); // sort array alphabetically  
}

function optimizedSearch(A, B, C) {
    const foundInA = [];
    const foundInB = [];
    const notFound = [];

    let aIndex = 0; // Current pointer in A
    let bIndex = 0; // Current pointer in B

    for (let c of C) {


        // Search in A
        let aFoundIndex = binarySearch(A, c, aIndex);
        if (aFoundIndex !== -1) {
            foundInA.push(aFoundIndex);
            aIndex = aFoundIndex + 1; // Move forward in A
            continue;
        }

        // Search in B
        let bFoundIndex = binarySearch(B, c, bIndex);
        if (bFoundIndex !== -1) {
            foundInB.push(bFoundIndex);
            bIndex = bFoundIndex + 1; // Move forward in B
            continue;
        }

        // If not found in both A and B
        notFound.push(c);
    }

    return { foundInA, foundInB, notFound };
}


// Binary search helper function
function binarySearch(array, target, start) {
    let low = start, high = array.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (array[mid] === target) return mid; // Found
        if (array[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Not found
}

const fuseOptions = {
    shouldSort: true,                // Sort results by score (Google-like)
    threshold: 0.2,                  // Allow some fuzziness, but prioritize close matches
    distance: 50,                    // Control how far apart search terms can be
    includeScore: true,              // Include score to sort and rank by relevance
    keys: [
      { name: 'title', weight: 0.7 },  // Prioritize title matches
      { name: 'content', weight: 0.3 } // Less weight for content matches
    ],
    tokenize: true,                  // Break query into tokens (mimic keyword search)
    matchAllTokens: true,            // Require all tokens to be found in the result
    minMatchCharLength: 2,           // Require at least two characters to match
    findAllMatches: true,            // Return all matching records
    isCaseSensitive: false           // Make search case-insensitive like Google
  };
  
  // Assuming you have a list of objects to search through
  //const fuse = new Fuse(dataArray, fuseOptions);
  
  // Perform a search
  //const results = fuse.search('your search query');
  //console.log(results);