import { DataSource, MigrationInterface, QueryRunner, TableColumn } from 'typeorm'
import { VBossLibrary } from '../entity/VBossLibrary'
import { VChatStartupLog } from '../entity/VChatStartupLog'
import { VCompanyLibrary } from '../entity/VCompanyLibrary'
import { VJobLibrary } from '../entity/VJobLibrary'
import { VMarkAsNotSuitLog } from '../entity/VMarkAsNotSuitLog'

const ViewEntities = [VBossLibrary, VChatStartupLog, VCompanyLibrary, VJobLibrary, VMarkAsNotSuitLog]

export class AddDistanceColumnsForChatStartupLog1768100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const EntityDefinition of ViewEntities) {
      const dataSource = queryRunner.connection as DataSource
      const viewMetadata = dataSource.getMetadata(EntityDefinition)
      await queryRunner.query(`DROP VIEW IF EXISTS "${viewMetadata.tableName}"`)
    }

    if (await queryRunner.hasTable('chat_startup_log')) {
      if (!(await queryRunner.hasColumn('chat_startup_log', 'distanceKm'))) {
        await queryRunner.addColumn(
          'chat_startup_log',
          new TableColumn({
            name: 'distanceKm',
            type: 'float',
            isNullable: true
          })
        )
      }

      if (!(await queryRunner.hasColumn('chat_startup_log', 'commuteCenterName'))) {
        await queryRunner.addColumn(
          'chat_startup_log',
          new TableColumn({
            name: 'commuteCenterName',
            type: 'varchar',
            isNullable: true
          })
        )
      }
    }

    for (const EntityDefinition of ViewEntities) {
      const dataSource = queryRunner.connection as DataSource
      const viewMetadata = dataSource.getMetadata(EntityDefinition)
      let expression = viewMetadata.expression
      if (typeof expression === 'function') {
        expression = expression(dataSource).getQuery()
      }
      await queryRunner.query(`CREATE VIEW "${viewMetadata.tableName}" AS ${expression}`)
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
