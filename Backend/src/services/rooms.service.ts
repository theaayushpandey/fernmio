import { nanoid } from 'nanoid'
import NodeCache from 'node-cache'
import { IRoom, IServerRoom } from '../types'

/*
12 hours expiry.
It is long enough to last for any meeting (too long) and shouldn't be needed normally, just for the case i fuck up somewhere
*/
const stdTTL = 12 * 60 * 60
const roomsCache = new NodeCache({
  stdTTL,
})

export class Rooms {
  private static internalKeys: [keyof Omit<IServerRoom, keyof IRoom>] = [
    'userIds',
  ]

  private static update(
    id: string,
    partial:
      | Partial<IServerRoom>
      | ((room: IServerRoom) => Partial<IServerRoom>),
  ): IServerRoom | null {
    const internal = roomsCache.get<IServerRoom>(id)
    if (!internal) {
      return null
    }

    let data: IServerRoom
    if (typeof partial === 'function') {
      data = {
        ...internal,
        ...partial(internal),
      }
    } else {
      data = {
        ...internal,
        ...partial,
      }
    }
    roomsCache.set<IServerRoom>(id, data)
    return data
  }

  static create(room: IRoom, userId: string): string {
    const id = nanoid()
    roomsCache.set<IServerRoom>(id, {
      ...room,
      id,
      userIds: [userId],
    })
    return id
  }

  static delete(id: string) {
    roomsCache.del(id)
  }

  static get(id?: string): IRoom | null {
    if (!id) {
      return null
    }
    const internal = roomsCache.get<IServerRoom>(id)
    if (!internal) {
      return null
    }

    let room: IRoom = {
      ...internal,
    }
    Rooms.internalKeys.forEach(key => {
      delete room[key as keyof IRoom]
    })
    return room
  }

  static size(id: string): number {
    return roomsCache.get<IServerRoom>(id)?.userIds.length || 0
  }

  static addUser(id: string, userId: string): void {
    if (this.getUsers(id).includes(userId)) {
      return
    }
    this.update(id, room => ({
      userIds: [...room.userIds, userId],
    }))
  }
  static removeUser(id: string, userId: string): void {
    this.update(id, room => ({
      userIds: room.userIds.filter(id => id !== userId),
    }))
  }

  static getUsers(id: string): string[] {
    return roomsCache.get<IServerRoom>(id)?.userIds || []
  }
}
