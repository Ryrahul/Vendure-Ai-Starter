/**
 * Sets up a fresh database: runs the migrations, then imports the sample data that
 * `@vendure/create` ships (tax zones, shipping, collections and ~50 products with images).
 *
 *   npm run populate           # skipped when the database already has products
 *   npm run populate -- --force
 *
 * After populating, start the server and run "Embed all" (Settings → Global settings in the
 * dashboard) so the AI assistant's semantic search knows the catalog.
 */
import { bootstrap, DefaultLogger, JobQueueService, LogLevel, Product, runMigrations, TransactionalConnection } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';

import { AiAssistantPlugin } from '@rahul_vendure/ai-chat-plugin';
import { AiChatDashboardPlugin } from '@rahul_vendure/ai-chat-dashboard';

import { config } from './vendure-config';

const dataDir = path.join(__dirname, '../populate');
const force = process.argv.includes('--force');

class AlreadyPopulated extends Error {}

async function main() {
    await runMigrations(config);

    const app = await populate(
        async () => {
            const app = await bootstrap({
                ...config,
                // No AI plugin while importing: it isn't needed and would embed every product.
                plugins: (config.plugins ?? []).filter(p => p !== AiAssistantPlugin && p !== AiChatDashboardPlugin),
                // A separate port, so this also works while the dev server is running.
                apiOptions: { ...config.apiOptions, port: 3099 },
                dbConnectionOptions: { ...config.dbConnectionOptions, synchronize: false },
                logger: new DefaultLogger({ level: LogLevel.Warn }),
                importExportOptions: { importAssetsDir: path.join(dataDir, 'images') },
            });
            const products = await app.get(TransactionalConnection).rawConnection.getRepository(Product).count();
            if (products > 0 && !force) {
                await app.close();
                throw new AlreadyPopulated(`The database already has ${products} products — nothing to do (use --force to import again).`);
            }
            await app.get(JobQueueService).start();
            return app;
        },
        path.join(dataDir, 'initial-data.json'),
        path.join(dataDir, 'products.csv'),
    );

    // Let the search-index jobs finish before closing.
    await sleep(5000);
    await app.close();
    console.log('Sample data imported. Start the server and run "Embed all" for the AI assistant.');
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        if (err instanceof AlreadyPopulated) {
            console.log(err.message);
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    });
