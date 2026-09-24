import { redirect } from 'next/navigation';

export default function StoreDefaultPage({ params }: { params: { storeId: string } }) {
  redirect(`/store/${params.storeId}/tables`);
}
