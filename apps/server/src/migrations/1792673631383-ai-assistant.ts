import {MigrationInterface, QueryRunner} from "typeorm";

export class AiAssistant1792673631383 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // pgvector stores the embeddings for semantic search (needs the extension installed,
        // e.g. the pgvector/pgvector Docker image).
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`, undefined);
        await queryRunner.query(`CREATE TABLE "product_embedding" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productId" integer NOT NULL, "contentHash" character varying(64), "embedding" vector(1536), "id" SERIAL NOT NULL, CONSTRAINT "PK_3c4652f5e8b4b91d203f854deb6" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "variant_embedding" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "productVariantId" integer NOT NULL, "embedding" vector(1536), "id" SERIAL NOT NULL, CONSTRAINT "PK_38c17d2da6dc26bad8ef1cf073b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "collection_embedding" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "collectionId" integer NOT NULL, "contentHash" character varying(64), "embedding" vector(1536), "id" SERIAL NOT NULL, CONSTRAINT "PK_fc1cc88a2a409f0a3e1c0ac5821" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "ai_chat_session" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sessionId" character varying NOT NULL, "administratorId" integer, "channelId" integer, "title" character varying(255) NOT NULL DEFAULT '', "messages" jsonb NOT NULL DEFAULT '[]', "messageCount" integer NOT NULL DEFAULT '0', "totalInputTokens" integer NOT NULL DEFAULT '0', "totalOutputTokens" integer NOT NULL DEFAULT '0', "model" character varying(100) NOT NULL DEFAULT '', "isActive" boolean NOT NULL DEFAULT true, "lastMessageAt" TIMESTAMP, "id" SERIAL NOT NULL, CONSTRAINT "UQ_a73ab94b7df886e83d681b81bea" UNIQUE ("sessionId"), CONSTRAINT "PK_c1bffbc812a20443f906e36786b" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_a73ab94b7df886e83d681b81be" ON "ai_chat_session" ("sessionId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_cf252d67b76c4160f0ebcc99ca" ON "ai_chat_session" ("administratorId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_0fa215c201973c5ec48e17dc75" ON "ai_chat_session" ("isActive") `, undefined);
        await queryRunner.query(`CREATE TABLE "ai_store_profile" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "channelId" integer NOT NULL, "city" character varying, "region" character varying, "countryCode" character varying, "serviceAreas" text, "businessDescription" text, "competitors" text, "supplierLeadTimeDays" integer, "notes" text, "id" SERIAL NOT NULL, CONSTRAINT "PK_6f774831a2f54c9a3e20af5519e" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4d9e88d2e2534c4bb24335b547" ON "ai_store_profile" ("channelId") `, undefined);
        await queryRunner.query(`ALTER TABLE "product_embedding" ADD CONSTRAINT "FK_0b03ec01718d953f5a061b0548a" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "variant_embedding" ADD CONSTRAINT "FK_b1cb79fa572c0857ace652a4c34" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_embedding" ADD CONSTRAINT "FK_ac9b86791afb461a3ee9b3c356b" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "ai_store_profile" ADD CONSTRAINT "FK_4d9e88d2e2534c4bb24335b5479" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "ai_store_profile" DROP CONSTRAINT "FK_4d9e88d2e2534c4bb24335b5479"`, undefined);
        await queryRunner.query(`ALTER TABLE "collection_embedding" DROP CONSTRAINT "FK_ac9b86791afb461a3ee9b3c356b"`, undefined);
        await queryRunner.query(`ALTER TABLE "variant_embedding" DROP CONSTRAINT "FK_b1cb79fa572c0857ace652a4c34"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_embedding" DROP CONSTRAINT "FK_0b03ec01718d953f5a061b0548a"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d9e88d2e2534c4bb24335b547"`, undefined);
        await queryRunner.query(`DROP TABLE "ai_store_profile"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fa215c201973c5ec48e17dc75"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_cf252d67b76c4160f0ebcc99ca"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_a73ab94b7df886e83d681b81be"`, undefined);
        await queryRunner.query(`DROP TABLE "ai_chat_session"`, undefined);
        await queryRunner.query(`DROP TABLE "collection_embedding"`, undefined);
        await queryRunner.query(`DROP TABLE "variant_embedding"`, undefined);
        await queryRunner.query(`DROP TABLE "product_embedding"`, undefined);
   }

}
