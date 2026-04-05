import 'reflect-metadata'
import { parentPort } from 'node:worker_threads'
import { initDb } from '@geekgeekrun/sqlite-plugin'
import { type DataSource } from 'typeorm'
import { getPublicDbFilePath } from '@geekgeekrun/geek-auto-start-chat-with-boss/runtime-file-utils.mjs'
import { VChatStartupLog } from '@geekgeekrun/sqlite-plugin/dist/entity/VChatStartupLog'
import { VJobLibrary } from '@geekgeekrun/sqlite-plugin/dist/entity/VJobLibrary'
import { VCompanyLibrary } from '@geekgeekrun/sqlite-plugin/dist/entity/VCompanyLibrary'
import { VBossLibrary } from '@geekgeekrun/sqlite-plugin/dist/entity/VBossLibrary'
import { VMarkAsNotSuitLog } from '@geekgeekrun/sqlite-plugin/dist/entity/VMarkAsNotSuitLog'
import { measureExecutionTime } from '../../../../../../common/utils/performance'
import { PageReq, PagedRes } from '../../../../../../common/types/pagination'
import { JobInfoChangeLog } from '@geekgeekrun/sqlite-plugin/dist/entity/JobInfoChangeLog'
import { AutoStartChatRunRecord } from '@geekgeekrun/sqlite-plugin/dist/entity/AutoStartChatRunRecord'
import { readConfigFile } from '@geekgeekrun/geek-auto-start-chat-with-boss/runtime-file-utils.mjs'
import {
  calculateDistanceKm,
  roundDistanceKm
} from '@geekgeekrun/geek-auto-start-chat-with-boss/distance-utils.mjs'

const dbInitPromise = initDb(getPublicDbFilePath())
let dataSource: DataSource | null = null

type SortOrder = 'asc' | 'desc'

function getCurrentDistanceConfig() {
  const bossConfig = readConfigFile('boss.json') ?? {}
  const commuteLatitude = parseFloat(bossConfig.commuteLatitude)
  const commuteLongitude = parseFloat(bossConfig.commuteLongitude)

  if (Number.isNaN(commuteLatitude) || Number.isNaN(commuteLongitude)) {
    return null
  }

  return {
    commuteLatitude,
    commuteLongitude,
    commuteCenterName: bossConfig.commuteCenterName ?? ''
  }
}

function fillDistanceForHistoryRecord(record: VChatStartupLog): VChatStartupLog {
  if (typeof record.distanceKm === 'number') {
    return record
  }

  const distanceConfig = getCurrentDistanceConfig()
  if (!distanceConfig) {
    return {
      ...record,
      distanceKm: null
    }
  }

  const latitude = parseFloat(String(record.latitude ?? ''))
  const longitude = parseFloat(String(record.longitude ?? ''))

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return {
      ...record,
      distanceKm: null
    }
  }

  const distanceKm = calculateDistanceKm(
    distanceConfig.commuteLatitude,
    distanceConfig.commuteLongitude,
    latitude,
    longitude
  )

  return {
    ...record,
    distanceKm: distanceKm === null ? null : roundDistanceKm(distanceKm),
    commuteCenterName: record.commuteCenterName ?? distanceConfig.commuteCenterName
  }
}

dbInitPromise.then(
  (_dataSource) => {
    dataSource = _dataSource
    attachMessageHandler()
    parentPort?.postMessage({
      type: 'DB_INIT_SUCCESS'
    })
  },
  (error) => {
    parentPort?.postMessage({
      type: 'DB_INIT_FAIL',
      error
    })
    process.exit(1)
  }
)

const payloadHandler = {
  async getAutoStartChatRecord({
    pageNo,
    pageSize,
    sortField,
    sortOrder
  }: Partial<PageReq> & {
    sortField?: 'distanceKm'
    sortOrder?: SortOrder
  } = {}): Promise<PagedRes<VChatStartupLog>> {
    if (!pageNo) {
      pageNo = 1
    }
    if (!pageSize) {
      pageSize = 10
    }

    const userRepository = dataSource!.getRepository(VChatStartupLog)!

    if (sortField === 'distanceKm' && (sortOrder === 'asc' || sortOrder === 'desc')) {
      const allData = await measureExecutionTime(
        userRepository.find({
          order: {
            date: 'DESC'
          }
        })
      )
      const filledData = allData.map(fillDistanceForHistoryRecord)
      filledData.sort((left, right) => {
        const leftDistance =
          typeof left.distanceKm === 'number' && !Number.isNaN(left.distanceKm)
            ? left.distanceKm
            : null
        const rightDistance =
          typeof right.distanceKm === 'number' && !Number.isNaN(right.distanceKm)
            ? right.distanceKm
            : null

        if (leftDistance === null && rightDistance === null) {
          return new Date(right.date).getTime() - new Date(left.date).getTime()
        }
        if (leftDistance === null) {
          return 1
        }
        if (rightDistance === null) {
          return -1
        }
        if (leftDistance === rightDistance) {
          return new Date(right.date).getTime() - new Date(left.date).getTime()
        }

        return sortOrder === 'asc' ? leftDistance - rightDistance : rightDistance - leftDistance
      })

      const startIndex = (pageNo - 1) * pageSize
      return {
        data: filledData.slice(startIndex, startIndex + pageSize),
        pageNo,
        totalItemCount: filledData.length
      }
    }

    const [data, totalItemCount] = await measureExecutionTime(
      userRepository.findAndCount({
        skip: (pageNo - 1) * pageSize,
        take: pageSize,
        order: {
          date: 'DESC'
        }
      })
    )
    return {
      data: data.map(fillDistanceForHistoryRecord),
      pageNo,
      totalItemCount
    }
  },
  async getMarkAsNotSuitRecord({ pageNo, pageSize }: Partial<PageReq> = {}): Promise<
    PagedRes<VMarkAsNotSuitLog>
  > {
    if (!pageNo) {
      pageNo = 1
    }
    if (!pageSize) {
      pageSize = 10
    }
    const recordRepository = dataSource!.getRepository(VMarkAsNotSuitLog)!
    const [data, totalItemCount] = await measureExecutionTime(
      recordRepository.findAndCount({
        skip: (pageNo - 1) * pageSize,
        take: pageSize,
        order: {
          date: 'DESC'
        }
      })
    )
    return {
      data,
      pageNo,
      totalItemCount
    }
  },
  async getJobLibrary({ pageNo, pageSize }: Partial<PageReq> = {}): Promise<PagedRes<VJobLibrary>> {
    if (!pageNo) {
      pageNo = 1
    }
    if (!pageSize) {
      pageSize = 10
    }

    const userRepository = dataSource!.getRepository(VJobLibrary)!
    const [data, totalItemCount] = await measureExecutionTime(
      userRepository.findAndCount({
        skip: (pageNo - 1) * pageSize,
        take: pageSize
      })
    )
    return {
      data,
      pageNo,
      totalItemCount
    }
  },
  async getCompanyLibrary({ pageNo, pageSize }: Partial<PageReq> = {}): Promise<
    PagedRes<VCompanyLibrary>
  > {
    if (!pageNo) {
      pageNo = 1
    }
    if (!pageSize) {
      pageSize = 10
    }

    const userRepository = dataSource!.getRepository(VCompanyLibrary)!
    const [data, totalItemCount] = await measureExecutionTime(
      userRepository.findAndCount({
        skip: (pageNo - 1) * pageSize,
        take: pageSize
      })
    )
    return {
      data,
      pageNo,
      totalItemCount
    }
  },
  async getBossLibrary({ pageNo, pageSize }: Partial<PageReq> = {}): Promise<
    PagedRes<VBossLibrary>
  > {
    if (!pageNo) {
      pageNo = 1
    }
    if (!pageSize) {
      pageSize = 10
    }

    const userRepository = dataSource!.getRepository(VBossLibrary)!
    const [data, totalItemCount] = await measureExecutionTime(
      userRepository.findAndCount({
        skip: (pageNo - 1) * pageSize,
        take: pageSize
      })
    )
    return {
      data,
      pageNo,
      totalItemCount
    }
  },
  async getJobHistoryByEncryptId({ encryptJobId }): Promise<JobInfoChangeLog[]> {
    const jobInfoChangeLogRepository = dataSource!.getRepository(JobInfoChangeLog)!
    const data = await measureExecutionTime(
      jobInfoChangeLogRepository.find({
        where: {
          encryptJobId
        }
      })
    )
    return data
  },
  async saveAndGetCurrentRunRecord() {
    const autoStartChatRunRecord = new AutoStartChatRunRecord()
    autoStartChatRunRecord.date = new Date()
    const autoStartChatRunRecordRepository = dataSource!.getRepository(AutoStartChatRunRecord)
    const result = await autoStartChatRunRecordRepository.save(autoStartChatRunRecord)
    return result
  }
}

async function attachMessageHandler() {
  parentPort?.on('message', async (event) => {
    const { _uuid, ...restObj } = event
    const { type } = event

    if (!dataSource) {
      await dbInitPromise
    }
    const result = await payloadHandler[type](restObj)
    parentPort?.postMessage({
      _uuid,
      data: result
    })
  })
}
