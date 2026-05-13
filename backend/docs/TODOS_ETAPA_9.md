# TODOs — Etapa 9: Campaigns + Audiences + Z-API

---
## TODO — soft-delete em Customer (quando implementar)

Atualmente Customer não tem deletedAt. DELETE /customers (se existir) é hard delete.

Quando soft-delete for adicionado a Customer:
1. Migration: ALTER TABLE Customer ADD COLUMN deletedAt TIMESTAMP(3)
2. Atualizar os 2 handlers de trigger pra incluir deletedAt: null no where:
   - src/campaigns/triggers/handlers/no-order-x-days.handler.ts
   - src/campaigns/triggers/handlers/first-order-placed.handler.ts
3. Adicionar 1 teste em cada handler verificando que customer soft-deleted é excluído
4. Verificar os 3 raw queries (birthday, anniversary, fiado-limit) também
---

## PRIORIDADE ALTA — pré-Z-API real

### dispatch.service.ts: customer com phone vazio/inválido

CENÁRIO ATUAL: phone='' não filtrado, normalizePhone retorna '55'. Mock mode
aceita, Z-API real vai rejeitar.

CORREÇÃO QUANDO PLUGAR Z-API:
1. zapi-client.normalizePhone(): retornar null se digits.length < 12
2. dispatch.service.ts processOne(): se normalizePhone retorna null, criar
   CampaignMessage com status=FAILED + errorMessage='Telefone inválido ou vazio'
3. Stats: failedCount inclui esses, mas dispatch ainda termina COMPLETED
