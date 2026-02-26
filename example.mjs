import OpenAI from "openai";
const client = new OpenAI();

var list_of_stores = await client.vector_stores.retrieve({
    vector_store_id: "vs_68b477f6bda08191a5c1a4f98d9f33ba"
});
console.log("LIST OF VECTOR STORES", list_of_stores)

console.log(response.output_text);