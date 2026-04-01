import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Crossword } from '../../models/crossword.model';
import { CrosswordSheetService } from '../../services/crossword-sheet.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  private readonly crosswordSheetService = inject(CrosswordSheetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly crosswords = signal<Crossword[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadCrosswords();
  }

  protected loadCrosswords(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.crosswordSheetService
      .getCrosswords()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (crosswords) => {
          this.crosswords.set(crosswords);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            'Unable to load crossword posts from Google Sheets. Add your public sheet ID in the crossword service and try again.',
          );
          this.crosswords.set([]);
          this.isLoading.set(false);
        },
      });
  }
}
