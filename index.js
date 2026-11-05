import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Converte un file locale in una stringa base64.
 * @param {string} filePath - Il percorso del file immagine.
 * @returns {string} L'immagine codificata in base64.
 */
function encodeImage(filePath) {
  const bitmap = fs.readFileSync(filePath);
  return Buffer.from(bitmap).toString('base64');
}

/**
 * Scansiona una fattura o una bolla di consegna tramite l'API OpenAI (Vision)
 * ed estrai i dati principali in formato JSON.
 * 
 * @param {string} imagePath - Il percorso del file immagine da analizzare.
 * @returns {Promise<Object|null>} I dati estratti dal documento o null in caso di errore.
 */
async function scansionaFattura(imagePath) {
  try {
    console.log(`Analisi del documento in corso: ${imagePath}...`);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Il file specificato non esiste: ${imagePath}`);
    }

    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';

    const base64Image = encodeImage(imagePath);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sei un assistente AI specializzato nella gestione amministrativa e di magazzino per la ristorazione (app Chef Control).
Analizza l'immagine della fattura o del documento di trasporto fornito ed estrai i dati richiesti.
Restituisci esclusivamente un oggetto JSON valido con la seguente struttura esatta:
{
  "fornitore": "Nome del fornitore",
  "data_documento": "YYYY-MM-DD",
  "lotto_prodotto": "Codice lotto se presente a livello generale, altrimenti null",
  "importo_pagato": 0.00,
  "articoli": [
    {
      "descrizione": "Nome del prodotto",
      "quantita": 0,
      "unita_misura": "kg/pezzi/litri",
      "prezzo_unitario": 0.00,
      "lotto": "Codice lotto specifico del prodotto se presente, altrimenti null"
    }
  ]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Estrai i dati da questa fattura o bolla di consegna:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
    });

    const risultatoJson = JSON.parse(response.choices[0].message.content);
    console.log("
--- Dati Estratti con Successo ---");
    console.log(JSON.stringify(risultatoJson, null, 2));

    return risultatoJson;

  } catch (error) {
    console.error("Errore durante la scansione della fattura:", error.message || error);
    return null;
  }
}

// Esecuzione di prova se il file viene lanciato direttamente
const percorsoImmagine = path.join(process.cwd(), 'fattura_esempio.jpg');

if (fs.existsSync(percorsoImmagine)) {
  scansionaFattura(percorsoImmagine);
} else {
  console.log("File 'index.js' caricato con successo. Per testare, inserisci un file 'fattura_esempio.jpg' nella radice del progetto ed esegui 'node index.js'.");
}

export { scansionaFattura };
