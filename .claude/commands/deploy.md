# Deploy FE-SPForecast a Azure

Despliega el frontend al ambiente indicado (dev o prod).

## Arquitectura

- **Registry**: `forecastregistry.azurecr.io` (en `rg-forecast-prod`)
- **Build**: ACR Tasks — se triggerean automáticamente con el push a GitHub
  - Push a rama `dev` → task `deploy-frontend-dev` → imagen `forecast-frontend-dev:latest`
  - Push a rama `main` → task `deploy-frontend-prod` → imagen `forecast-frontend-prod:latest`
- **Container Apps**:
  - Dev: `forecast-frontend-dev` en `rg-forecast-dev` → https://forecast-frontend-dev.yellowsea-99dbc30d.eastus.azurecontainerapps.io
  - Prod: `forecast-frontend-prod` en `rg-forecast-prod` → https://forecast-frontend-prod.blacksky-3eda147f.eastus.azurecontainerapps.io
- **Suscripción**: `6e2504a6-51e0-4497-b4bc-1d77d497257a`

> El paso `az containerapp update` en las ACR Tasks está **comentado** por falta de permisos de Owner. Siempre hay que correrlo manualmente después del build.

---

## Pasos

### 1. Asegurarse que el código está pusheado a la rama correcta

Para **dev**:
```bash
git push origin main:dev
```
Para **prod** (ya en main):
```bash
git push origin main
```

### 2. Verificar que la ACR Task completó

```bash
# Dev
az acr task list-runs --registry forecastregistry --name deploy-frontend-dev --top 3 --query "[].{run:runId, status:status, startTime:startTime}" -o table

# Prod
az acr task list-runs --registry forecastregistry --name deploy-frontend-prod --top 3 --query "[].{run:runId, status:status, startTime:startTime}" -o table
```

Esperar a que el run más reciente diga `Succeeded`. Si no triggeró, correr el build manualmente:
```bash
az acr task run --registry forecastregistry --name deploy-frontend-[dev|prod]
```

### 3. Actualizar el Container App con la nueva imagen

```bash
# Dev
az containerapp update \
  --name forecast-frontend-dev \
  --resource-group rg-forecast-dev \
  --image forecastregistry.azurecr.io/forecast-frontend-dev:latest \
  --query "{revision:properties.latestRevisionName}" -o table

# Prod
az containerapp update \
  --name forecast-frontend-prod \
  --resource-group rg-forecast-prod \
  --image forecastregistry.azurecr.io/forecast-frontend-prod:latest \
  --query "{revision:properties.latestRevisionName}" -o table
```

### 4. Verificar que el sitio responde

```bash
# Dev
curl -s -o /dev/null -w "%{http_code}" https://forecast-frontend-dev.yellowsea-99dbc30d.eastus.azurecontainerapps.io/

# Prod
curl -s -o /dev/null -w "%{http_code}" https://forecast-frontend-prod.blacksky-3eda147f.eastus.azurecontainerapps.io/
```

Tiene que devolver `200` o `307` (redirect de login).

---

## Deploy completo (dev + prod en un solo paso)

```bash
# 1. Sync dev con main
git push origin main:dev

# 2. Verificar builds (esperar Succeeded en ambos)
az acr task list-runs --registry forecastregistry --name deploy-frontend-dev --top 1 -o table
az acr task list-runs --registry forecastregistry --name deploy-frontend-prod --top 1 -o table

# 3. Actualizar ambos Container Apps
az containerapp update --name forecast-frontend-dev --resource-group rg-forecast-dev --image forecastregistry.azurecr.io/forecast-frontend-dev:latest
az containerapp update --name forecast-frontend-prod --resource-group rg-forecast-prod --image forecastregistry.azurecr.io/forecast-frontend-prod:latest
```

---

## Pendiente para automatización completa

Un **Owner** de la suscripción debe asignar Contributor a las managed identities de las ACR Tasks:

```bash
az role assignment create \
  --assignee 0e4620bd-a299-456c-b3e7-5a5017982932 \
  --role Contributor \
  --scope /subscriptions/6e2504a6-51e0-4497-b4bc-1d77d497257a/resourceGroups/rg-forecast-dev

az role assignment create \
  --assignee e2098b4b-e632-4d6f-a17d-5a2dbd059e3b \
  --role Contributor \
  --scope /subscriptions/6e2504a6-51e0-4497-b4bc-1d77d497257a/resourceGroups/rg-forecast-prod
```

Luego descomentar el step `cmd` en `.azure/acr-task-dev.yaml` y `.azure/acr-task-prod.yaml`.
