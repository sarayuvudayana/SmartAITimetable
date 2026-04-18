export interface AiResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export async function callGroqApi(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for deterministic/reliable swaps
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API call failed');
  }

  const data: AiResponse = await response.json();
  return data.choices[0].message.content;
}
