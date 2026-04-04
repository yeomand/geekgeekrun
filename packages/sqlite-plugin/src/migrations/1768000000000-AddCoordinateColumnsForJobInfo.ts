import { MigrationInterface, QueryRunner } from "typeorm"

export class AddCoordinateColumnsForJobInfo1768000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_info" ADD COLUMN "longitude" float`)
      .catch(() => void 0)
    await queryRunner.query(`ALTER TABLE "job_info" ADD COLUMN "latitude" float`)
      .catch(() => void 0)
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
  }
}
