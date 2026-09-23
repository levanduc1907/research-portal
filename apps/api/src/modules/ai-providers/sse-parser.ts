export async function consumeSse(
  response: Response,
  onData: (data: string) => void,
): Promise<void> {
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Provider returned ${response.status}: ${detail}`);
  }

  if (!response.body) throw new Error("Provider returned an empty stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data && data !== "[DONE]") onData(data);
    }
  }
}
