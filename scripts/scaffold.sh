#!/bin/bash

echo "Scaffolding project structure..."

mkdir -p app/{auth,dashboard}
mkdir -p app/{manufacturers,items,customers,suppliers}
mkdir -p app/{sales,purchases,returns,payments,reports,settings}

mkdir -p app/api/{auth,tenants}
mkdir -p app/api/{manufacturers,items,customers,suppliers}
mkdir -p app/api/{sales,purchases,returns,payments,reports}

mkdir -p lib/{auth,db,tenant,permissions,utils}
mkdir -p prisma
mkdir -p components/{ui,forms,tables}
mkdir -p hooks
mkdir -p types
mkdir -p middleware
mkdir -p scripts

touch lib/db/prisma.ts
touch lib/auth/auth.ts
touch lib/tenant/requireTenant.ts
touch lib/permissions/rbac.ts

touch middleware.ts

echo "Project structure created successfully."
