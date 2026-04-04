import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Crossword } from '../../models/crossword.model';
import { CrosswordSheetService } from '../../services/crossword-sheet.service';
import { heroPlaySolid, heroLinkSolid, heroCalendarSolid } from '@ng-icons/heroicons/solid';
import { NgIcon, provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe, NgIcon],
  templateUrl: './home-page.component.html',
  providers: [provideIcons({ heroPlaySolid, heroLinkSolid, heroCalendarSolid })],
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

  getDifficultyBgStyle(difficulty: number): { backgroundColor: string } {
    // Interpolate: teal(1) → gold(5) → coral(10)
    const stops: Record<number, string> = {
      1: 'var(--color-accent-teal)',
      5: 'var(--color-accent-gold)',
      10: 'var(--color-accent-coral)',
    };

    // For exact stops, return the CSS variable directly
    if (stops[difficulty]) {
      return { backgroundColor: stops[difficulty] };
    }

    // For in-between steps, blend via color-mix
    if (difficulty < 5) {
      const pct = ((difficulty - 1) / 4) * 100;
      return {
        backgroundColor: `color-mix(in oklch, var(--color-accent-gold) ${pct}%, var(--color-accent-teal))`,
      };
    } else {
      const pct = ((difficulty - 5) / 5) * 100;
      return {
        backgroundColor: `color-mix(in oklch, var(--color-accent-coral) ${pct}%, var(--color-accent-gold))`,
      };
    }
  }
}
