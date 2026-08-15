<!-- Merci pour la PR. Remplir les sections ci-dessous, supprimer ce que vous n'utilisez pas. -->

## Résumé

<!-- 1 à 3 phrases : quel problème cette PR résout, et comment. -->

## Changements

<!-- Liste à puces des modifications visibles côté code, API, ou SDK. -->

- 
- 

## Type

- [ ] feat (nouvelle fonctionnalité)
- [ ] fix (correction de bug)
- [ ] refactor (réorganisation sans changement de comportement)
- [ ] perf (gain de perf mesurable)
- [ ] docs (documentation uniquement)
- [ ] test (ajout/correction de tests)
- [ ] chore / ci

## Issue liée

<!-- Closes #123 -->

## Test plan

<!-- Comment vous avez validé la PR. Idéalement, commandes à recopier. -->

- [ ] `pnpm test` passe
- [ ] `pnpm -r exec tsc --noEmit` passe
- [ ] `pnpm lint` passe
- [ ] Test manuel sur (à préciser)

## Breaking changes

<!-- Si oui, expliquer la migration. Sinon "Aucun". -->

## Checklist

- [ ] J'ai ajouté/mis à jour les tests
- [ ] J'ai mis à jour la doc impactée (README, docs/, openapi.yaml, CHANGELOG)
- [ ] Aucun secret dans le diff
- [ ] Les requêtes Prisma sur tables tenant-scoped filtrent bien par `storeId`
- [ ] Les inputs publics sont validés par schema
