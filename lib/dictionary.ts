// We'll use a real dictionary API to validate words
const API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/"

// Type for the API response
type DictionaryResponse = {
  word: string
  phonetics: Array<{
    text: string
    audio?: string
  }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      synonyms: string[]
      antonyms: string[]
    }>
  }>
}[]

// Cache for API responses to avoid repeated calls
const cache: Record<string, boolean> = {}

export async function isValidEnglishWord(word: string): Promise<boolean> {
  // Check cache first
  if (cache[word] !== undefined) {
    return cache[word]
  }

  try {
    const response = await fetch(`${API_URL}${word.toLowerCase()}`)
    const isValid = response.status === 200

    // Cache the result
    cache[word] = isValid

    return isValid
  } catch (error) {
    console.error("Error validating word:", error)
    return false
  }
}

export async function getWordDefinition(word: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}${word.toLowerCase()}`)

    if (!response.ok) {
      return "A challenging English word."
    }

    const data = (await response.json()) as DictionaryResponse

    if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
      return data[0].meanings[0].definitions[0].definition
    }

    return "A challenging English word."
  } catch (error) {
    console.error("Error fetching definition:", error)
    return "A challenging English word."
  }
}
