// test-flow.js
async function testFlow() {
  // 1. Create job
  const createResponse = await fetch("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "a sunset",
      mediaType: "image",
      model: "gemini-pro-image",
      provider: "google",
      numberOfImages: 1,
    }),
  });

  const { jobId } = await createResponse.json();
  console.log("Job created:", jobId);

  // 2. Poll for status
  while (true) {
    const statusResponse = await fetch(
      `http://localhost:3000/api/generate/status?jobId=${jobId}`,
    );
    const job = await statusResponse.json();

    console.log(`Status: ${job.status}, Progress: ${job.progress}%`);

    if (job.status === "completed") {
      console.log("Result:", job.result);
      break;
    }

    if (job.status === "failed") {
      console.error("Failed:", job.error);
      break;
    }

    await new Promise((r) => setTimeout(r, 20000)); // Wait 2s
  }
}

testFlow();
