import { db } from '@/db/client';
import { buckets } from '@/db/schema';
import { newId } from '@/lib/id';

export interface CreateBucketInput {
  name: string;
  color: string;
  icon: string;
  kind: 'spending' | 'saving';
  fundingType: 'fixed' | 'percentage';
  monthlyTargetCents?: number;
  isReserve?: boolean;
  physicalLocation?: 'checking' | 'caixinha';
  sortOrder?: number;
}

export async function createBucket(input: CreateBucketInput): Promise<string> {
  const id = newId();
  await db.insert(buckets).values({
    id,
    name: input.name,
    color: input.color,
    icon: input.icon,
    kind: input.kind,
    fundingType: input.fundingType,
    monthlyTargetCents: input.monthlyTargetCents ?? null,
    isReserve: input.isReserve ?? false,
    physicalLocation: input.physicalLocation ?? 'checking',
    sortOrder: input.sortOrder ?? 0,
  });
  return id;
}
