import { SqlValidatorService } from '../../services/sql-validator.service';
import { SqlValidationResult } from '../../services/sql-validator.service';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sql-warning-popup',
  imports: [CommonModule],
  templateUrl: './sql-warning-popup.html',
  styleUrl: './sql-warning-popup.css',
})
export class SqlWarningPopup {
    @Input() validation!: SqlValidationResult;
  @Input() originalQuery: string = '';
  @Output() onClose   = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

}
