# TODOs — Etapa 9: Campaigns + Audiences + Z-API

## PRIORIDADE ALTA — pré-Z-API real

### dispatch.service.ts: customer com phone vazio/inválido

CENÁRIO ATUAL: phone='' não filtrado, normalizePhone retorna '55'. Mock mode
aceita, Z-API real vai rejeitar.

CORREÇÃO QUANDO PLUGAR Z-API:
1. zapi-client.normalizePhone(): retornar null se digits.length < 12
2. dispatch.service.ts processOne(): se normalizePhone retorna null, criar
   CampaignMessage com status=FAILED + errorMessage='Telefone inválido ou vazio'
3. Stats: failedCount inclui esses, mas dispatch ainda termina COMPLETED
