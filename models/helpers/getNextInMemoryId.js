module.exports = function getNextInMemoryId(tasks) {
  const nums = (tasks || [])
    .map(t => parseInt(t._id, 10))
    .filter(n => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1);
};
