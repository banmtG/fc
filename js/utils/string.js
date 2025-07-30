function levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const dp = [];
  
    // Initialize the matrix
    for (let i = 0; i <= len1; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }
  
    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
  
    return dp[len1][len2]; // Return the Levenshtein distance
  }
  
  function stringSimilarityPercentage(s1, s2) {
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
  
    // Similarity = (1 - (distance / maxLen)) * 100
    return ((1 - (distance / maxLen)) * 100).toFixed(2); // Result in percentage
  }
  
  function matchStringsWithThreshold(s1, s2, threshold) {
    const similarity = stringSimilarityPercentage(s1, s2);
    
    return similarity >= threshold; // Return true if similarity meets threshold
  }

  
// const sentence1 = "Quick fox brown jumps over the lazy dog";
// const sentence2 = "The quick brown fox jumps the dog";
// const threshold = 50; // Match percentage threshold


// const similarity = stringSimilarityPercentage(sentence1, sentence2);
// console.log(`Similarity: ${similarity}%`);

// const isMatch = matchStringsWithThreshold(sentence1, sentence2, threshold);
// console.log(`Does it match at least ${threshold}%?`, isMatch);

function removeCharactersFromString(str, charsToRemove) {
  //console.log(charsToRemove);
  // Create a regular expression pattern by joining the characters to remove
  const pattern = new RegExp(`[${charsToRemove.join('')}]`, 'g');
  
  // Replace all occurrences of the characters with an empty string
  return str.replace(pattern, '');
}

// Example usage:
// const originalString = "(as)    easy as pie";
// const charsToRemove = ['(', ')'];  // characters to remove
// const result = removeRedundantSpaces(removeCharactersFromString(originalString, charsToRemove));

// console.log(result);  // Output: "e wrd!"


function removeRedundantSpaces(str) {
  // Use a regular expression to replace multiple spaces with a single space
  return str.trim().replace(/\s+/g, ' ');
}

function stringToArray(inputString,character) {
  // Ensure input is a string
  if (typeof inputString !== "string") {
    console.error("Input is not a string.");
    return [];
  }

  // Trim whitespace and split by commas, filter out empty elements
  const result = inputString
    .split(character)                // Split the string by commas
    .map(item => item.trim())  // Trim whitespace around each element
    .filter(item => item);     // Remove empty strings caused by consecutive commas or trailing commas

  return result;
}

// Examples need to add character
// console.log(stringToArray(""));                      // []
// console.log(stringToArray("apple"));                 // ["apple"]
// console.log(stringToArray("apple, banana, cherry")); // ["apple", "banana", "cherry"]
// console.log(stringToArray("  apple ,  banana ,  ")); // ["apple", "banana"]
// console.log(stringToArray(", , ,"));                // []
// console.log(stringToArray(" , apple , , banana"));   // ["apple", "banana"]

function stringToArrayWithQuotes(inputString) {
  // Ensure input is a string
  if (typeof inputString !== "string") {
    console.error("Input is not a string.");
    return [];
  }

  // Match all quoted strings using a regex
  const regex = /"([^"]*)"/g;
  const result = [];
  let match;

  while ((match = regex.exec(inputString)) !== null) {
    result.push(match[1].trim()); // Extract the content inside quotes and trim whitespace
  }

  return result;
}

// Examples
// console.log(stringToArrayWithQuotes('')); // []
// console.log(stringToArrayWithQuotes('"child1"')); // ["child1"]
// console.log(stringToArrayWithQuotes('"child1","child2, with comma","child3"')); // ["child1", "child2, with comma", "child3"]
// console.log(stringToArrayWithQuotes('  " child1 " , "child2"  ,  "child3 " ')); // ["child1", "child2", "child3"]
// console.log(stringToArrayWithQuotes('"child1","child2",""')); // ["child1", "child2", ""]
// console.log(stringToArrayWithQuotes('""')); // [""]
// console.log(stringToArrayWithQuotes('"child1","child2, with , commas","child3"')); // ["child1", "child2, with , commas", "child3"]


function arrayToStringWithQuotes(inputArray) {
  // Ensure input is an array
  if (!Array.isArray(inputArray)) {
    console.error("Input is not an array.");
    return '""';
  }

  // Handle empty array case
  if (inputArray.length === 0) {
    return '""';
  }

  // Convert array elements to quoted strings and join with commas
  const result = inputArray.map((item) => `"${item}"`).join(",");

  return result;
}

// Examples
// console.log(arrayToStringWithQuotes([])); // ""
// console.log(arrayToStringWithQuotes(["child1"])); // "child1"
// console.log(arrayToStringWithQuotes(["child1", "child2, with comma", "child3"])); // "child1","child2, with comma","child3"
// console.log(arrayToStringWithQuotes(["child1", "", "child3"])); // "child1","","child3"
// console.log(arrayToStringWithQuotes([""])); // ""
// console.log(arrayToStringWithQuotes(["child1", "child2, with , commas", "child3"])); // "child1","child2, with , commas","child3"


function removeDuplicatesArray(array, key) {
  const unique = new Map(); // Use a Map to maintain unique entries

  array.forEach(item => {
    // Use the value of 'key' as the unique identifier
    if (!unique.has(item[key])) {
      unique.set(item[key], item); // Add the object if the key is not already in the Map
    }
  });

  // Return the values from the Map, which are the unique objects
  return Array.from(unique.values());
}

