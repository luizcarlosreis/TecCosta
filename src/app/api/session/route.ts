import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('teccosta-session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = JSON.parse(sessionCookie.value) as { id: string; name: string; role: string };
    return NextResponse.json({ user }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
