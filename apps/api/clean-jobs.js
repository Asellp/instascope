const { Queue } = require("bullmq");

async function main() {
  const queue = new Queue("collect", {
    connection: { host: "localhost", port: 6379 },
  });

  const repeatableJobs = await queue.getRepeatableJobs();
  console.log(repeatableJobs.length + " adet repeatable job bulundu.");

  for (const job of repeatableJobs) {
    console.log("Siliniyor: " + job.id + " (" + job.key + ")");
    await queue.removeRepeatableByKey(job.key);
  }

  console.log("Temizlik tamamlandi.");
  await queue.close();
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
