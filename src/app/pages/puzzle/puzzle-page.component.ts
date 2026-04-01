import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { of, switchMap } from 'rxjs';

import { Crossword } from '../../models/crossword.model';
import { CrosswordSheetService } from '../../services/crossword-sheet.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLeftSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-puzzle-page',
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ heroArrowLeftSolid })],
  templateUrl: './puzzle-page.component.html',
})
export class PuzzlePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly crosswordSheetService = inject(CrosswordSheetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly crossword = signal<Crossword | null>(null);
  protected readonly safePuzzleUrl = signal<SafeResourceUrl | null>(null);
  protected readonly isLoading = signal(true);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id')?.trim() ?? '';
          if (!id) {
            return of(undefined);
          }

          return this.crosswordSheetService.getCrosswordById(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (crossword) => {
          if (!crossword) {
            this.router.navigate(['/'], { replaceUrl: true });
            return;
          }

          const safeUrl = this.toSafeResourceUrl(crossword.puzzleUrl);
          if (!safeUrl) {
            this.router.navigate(['/'], { replaceUrl: true });
            return;
          }

          this.crossword.set(crossword);
          this.safePuzzleUrl.set(safeUrl);
          this.isLoading.set(false);
        },
        error: () => {
          this.router.navigate(['/'], { replaceUrl: true });
        },
      });
  }

  private toSafeResourceUrl(puzzleUrl: string): SafeResourceUrl | null {
    try {
      const parsed = new URL(puzzleUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return null;
      }

      return this.sanitizer.bypassSecurityTrustResourceUrl(parsed.toString());
    } catch {
      return null;
    }
  }
}
