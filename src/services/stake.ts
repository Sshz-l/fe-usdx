import request from '@/utils/request'
import { store } from '@/stores'

const defaultRes = {
  data: {
    code: 1,
    data: {
      total: 0,
      data: [],
    },
  },
}

export type TClub = {
  name: string
  wallet_address: `0x${string}`
  contract_address: string
  stake_contract_address: string
  token_id: number
  token_name: string
  pic: string
  pay_amount?: string // int
  in_way: (1 | 2) | ('1' | '2') // 1 free    2 pay
  chain_id: number
  billing_cycle?: 6 | 12
  group_id?: number
  gid?: string
  content?: string
}

export async function createClub(data: TClub) {
  return await request.post('/debox/staked/create_club', {
    ...data,
    chain_id: data.chain_id ?? store?.walletStore?.defaultChainId,
  })
}

export async function subgroupUpgrade(data: TClub) {
  return await request.post('/debox/staked/subgroup_upgrade', {
    ...data,
    chain_id: data.chain_id ?? store?.walletStore?.defaultChainId,
  })
}

export type TChannel = {
  wallet_address: `0x${string}`
  token_id?: number
  token_name?: string
  contract_address?: string
  stake_contract_address?: string
  type_id?: string
  source?: number
  remark?: string
  main_id?: number | string
  chain_id: number
}

export async function createChannel(data: TChannel) {
  return await request.post('/debox/staked/create_channel', {
    ...data,
    main_id: +(data?.main_id || '0'),
    type_id: +(data?.type_id || '0'),
  })
}

export async function getMyClubList(data: {
  wallet_address?: `0x${string}`
  page: number
  size: number
  chain_id?: number
  source: 0 | 1 // '0 club  1 chilren club'
}) {
  if (data?.wallet_address && data?.chain_id) {
    return await request.post('/debox/staked/my_pledge_list', data)
  }
  return Promise.resolve(defaultRes)
}

export async function getClubList(data: {
  wallet_address?: `0x${string}`
  page: number
  size: number
  chain_id?: number
}) {
  if (data?.wallet_address && data?.chain_id) {
    return await request.post('/debox/staked/club_list', data)
  }
  return Promise.resolve(defaultRes)
}

export async function getJoinClub(data: {
  wallet_address?: `0x${string}`
  page: number
  size: number
  chain_id?: number
}) {
  if (data?.wallet_address && data?.chain_id) {
    return await request.post('/debox/staked/my_clubs', data)
  }
  return Promise.resolve(defaultRes)
}

export async function getClubInfoByID(data: {
  wallet_address?: `0x${string}`
  id: number
  chain_id?: number
}) {
  if (data?.wallet_address && data?.chain_id) {
    return await request.post('/debox/staked/club_infos', data)
  }
  return null
}

export async function getClubMembers(data: {
  page: number
  size: number
  chain_id?: number
  club_id: number
  search_member?: string
  wallet_address?: `0x${string}`
}) {
  if (data?.chain_id && data?.wallet_address) {
    return await request.post('/debox/staked/members', data)
  }
  return Promise.resolve(defaultRes)
}

export async function getStakeNfts(data?: { chain_id?: number }) {
  return await request.get(`/debox/staked/myStakeNftList`, {
    params: {
      chain_id: data?.chain_id ?? store?.walletStore?.defaultChainId,
    },
  })
}

export async function postSTSData(type: number = 0) {
  return request.post('/debox/website/sts', {
    type,
  })
}

export async function getChannelList(data: {
  wallet_address?: `0x${string}`
  page: number
  size: number
  chain_id?: number
  source?: 1
}) {
  if (!data?.wallet_address) {
    return Promise.resolve(defaultRes)
  }
  return request.post('/debox/staked/sub_channel_list', { ...data, source: 1 })
}

export async function getGroupList(data: {
  wallet_address?: `0x${string}`
  page: number
  size: number
}) {
  if (!data?.wallet_address) {
    return Promise.resolve(defaultRes)
  }
  return request.post('/debox/staked/subgroup_list', data)
}

export async function getMainChannel(data: { wallet_address?: `0x${string}` }) {
  return request.post('/debox/subchannel_staked/main_channel', data)
}

export async function getChildChannel(data: { main_id: string }) {
  return request.post('/debox/subchannel_staked/sub_channel_category', data)
}

export async function getClubDetailByGroupId(data: {
  wallet_address?: `0x${string}`
  gid?: string
  chain_id?: number
}) {
  return request.post('/debox/dao/club_detail', data)
}

export type TVboxUpgrade = {
  gid: string
  id: number
  name: string
  note: string
  pic: string
  [property: string]: unknown
}

export async function getVboxOrder() {
  return request.get('/debox/web/club/vbox_order')
}

export async function postVboxUpgrade(data: TVboxUpgrade) {
  return request.post('/debox/web/club/vbox_upgrade', data)
}

export async function postVboxCreate(data: TVboxUpgrade) {
  return request.post('/debox/web/club/vbox_create', data)
}
