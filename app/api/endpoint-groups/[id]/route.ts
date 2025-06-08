import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { endpointGroups, endpointToGroup } from "@/lib/db/schema/endpoint-groups"
import { eq, and } from "drizzle-orm"

export const runtime = 'edge'

interface UpdateEndpointGroupRequest {
  name: string
  endpointIds: string[]
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      )
    }

    const db = await getDb()
    const { id } = await params
    
    // 检查接口组是否存在且属于当前用户
    const group = await db.query.endpointGroups.findFirst({
      where: and(
        eq(endpointGroups.id, id),
        eq(endpointGroups.userId, session.user.id)
      )
    })

    if (!group) {
      return NextResponse.json(
        { error: "接口组不存在或无权访问" },
        { status: 404 }
      )
    }

    // 解析请求体
    const body = await request.json() as UpdateEndpointGroupRequest
    const { name, endpointIds } = body

    if (!name || !endpointIds || !Array.isArray(endpointIds)) {
      return NextResponse.json(
        { error: "请求参数错误" },
        { status: 400 }
      )
    }

    // 更新接口组名称
    await db.update(endpointGroups)
      .set({ name })
      .where(eq(endpointGroups.id, id))

    // 删除旧的关联关系
    await db.delete(endpointToGroup)
      .where(eq(endpointToGroup.groupId, id))

    // 创建新的关联关系
    if (endpointIds.length > 0) {
      await db.insert(endpointToGroup).values(
        endpointIds.map(endpointId => ({
          groupId: id,
          endpointId
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新接口组失败:', error)
    return NextResponse.json(
      { error: '更新接口组失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    const db = await getDb()

    const { id } = await params
    
    const group = await db.query.endpointGroups.findFirst({
      where: (groups, { and, eq }) => and(
        eq(groups.id, id),
        eq(groups.userId, session!.user!.id!)
      )
    })

    if (!group) {
      return NextResponse.json(
        { error: "接口组不存在或无权访问" },
        { status: 404 }
      )
    }

    await db.delete(endpointToGroup).where(eq(endpointToGroup.groupId, id))
    
    await db.delete(endpointGroups).where(eq(endpointGroups.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除接口组失败:', error)
    return NextResponse.json(
      { error: '删除接口组失败' },
      { status: 500 }
    )
  }
} 