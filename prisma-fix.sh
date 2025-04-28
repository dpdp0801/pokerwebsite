#!/bin/bash
echo "Installing and generating Prisma client..."
npm install prisma --save
npm install @prisma/client --save
npx prisma generate
echo "Prisma client generation completed." 