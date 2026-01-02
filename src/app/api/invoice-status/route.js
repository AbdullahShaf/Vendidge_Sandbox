import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function PUT(request) {
    try {
        const body = await request.json();
        const { userId, id, fbrInvoiceNo, status } = body;

        console.log("Received invoice status update:", userId, id, fbrInvoiceNo, status);

        if (!userId || !id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: user id, invoice id, status' },
                { status: 400 }
            );
        }

        await db.query(
            `UPDATE invoices 
             SET status = ?, fbr_invoice_no = ? 
             WHERE user_id = ? AND id = ?`,
            [
                status,
                fbrInvoiceNo ?? null,
                userId,
                id
            ]
        );

        return NextResponse.json(
            { message: 'Invoice updated successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.warn(error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
