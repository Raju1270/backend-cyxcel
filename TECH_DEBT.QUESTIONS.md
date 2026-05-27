### Tech debt: Questions module DB spikes (queries-in-loops)

#### Summary
- **Area**: Questions module
- **Primary hotspot**: `QuestionsService.updateQuestion()` in `app/src/modules/questions/questions.service.ts`
- **Problem**: DB queries executed **inside loops** (a `while` traversal + a recursive loop), which can produce **N+1** query patterns and request-time **DB spikes** as version chains grow.

#### Why this happens
The `Question` model supports versioning via:
- `inactive: boolean`
- `replacedById: string | null` (inactive questions point to the active question that replaced them; legacy/older data may form chains)

When updating a question, we currently:
- Traverse `replacedById` forward with a `while` loop, querying once per hop.
- Walk prior inactive versions with a recursive function that performs a DB query per node.

This makes total DB queries scale with history size:
- Version chain length \(N\) → up to **N sequential queries** (forward traversal)
- Inactive history size \(M\) → up to **O(M)** queries (recursive discovery)

#### Evidence (current pattern)
In `QuestionsService.updateQuestion()`:
- A query inside a `while` loop:

```ts
while (nextId) {
  const nextQuestion = await tx.question.findUnique({
    where: { id: nextId },
    select: { id: true, inactive: true, replacedById: true },
  });
  if (!nextQuestion) break;
  if (!nextQuestion.inactive) break;
  nextId = nextQuestion.replacedById;
}
```

- A query inside a recursive loop:

```ts
const inactiveQuestions = await tx.question.findMany({
  where: { replacedById: questionId, inactive: true },
  select: { id: true },
});

for (const inactive of inactiveQuestions) {
  allInactiveIds.push(inactive.id);
  await findRecursive(inactive.id);
}
```

#### Impact
- **Spiky DB load** during updates to questions with deep version history.
- **Longer request latency** because queries are sequential inside a transaction.
- Risk of **connection pool contention** under concurrent updates.

#### Recommended fix (when we address this)
- **Use PostgreSQL recursive CTEs** (via Prisma `$queryRaw` / `Prisma.sql`) to collapse the chain with a **constant number of round-trips**:
  - Compute the current active “terminal” question id in one query.
  - Compute all prior inactive version ids in one query (walk backward by `replacedById`).
  - Perform a single `updateMany` to mark old versions inactive and set their `replacedById` to the new active question id (flatten chain).

- **Add a non-unique index** on `Question.replacedById` to make chain traversal/history lookups fast.

#### Success criteria
- `updateQuestion()` performs a **constant** number of DB queries regardless of chain depth/history size.
- API behavior remains unchanged: a new active question is created, older versions become inactive, and old versions reference the newest active question for version history.

