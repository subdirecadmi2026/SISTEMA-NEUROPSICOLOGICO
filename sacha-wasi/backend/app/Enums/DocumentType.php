<?php

namespace App\Enums;

enum DocumentType: string
{
    case Invoice = 'invoice';
    case SalesNote = 'sales_note';
    case Ticket = 'ticket';
    case CreditNote = 'credit_note';
    case Proforma = 'proforma';
    case Quote = 'quote';

    public function sriCode(): string
    {
        return match ($this) {
            self::Invoice => '01',
            self::CreditNote => '04',
            self::SalesNote, self::Ticket, self::Proforma, self::Quote => '00',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Invoice => 'Factura',
            self::SalesNote => 'Nota de venta',
            self::Ticket => 'Ticket',
            self::CreditNote => 'Nota de crédito',
            self::Proforma => 'Proforma',
            self::Quote => 'Cotización',
        };
    }
}
