import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, pipe, tap } from 'rxjs';

import { Crossword } from '../models/crossword.model';

const SHEET_CONFIG = {
  // Replace with your sheet ID once your public sheet exists.
  sheetId: '1muqUGDvCWFnIlWk_o5pQbPAY9IiuXSG1FkmQslXWDs0',
  worksheet: '0',
  query: 'select A,B,C,D,E,F,G,H where A <> "id"',
} as const;

interface GvizCell {
  v: string | number | null;
  f?: string;
}

interface GvizRow {
  c: Array<GvizCell | null>;
}

interface GvizResponse {
  table?: {
    rows?: GvizRow[];
  };
}

@Injectable({ providedIn: 'root' })
export class CrosswordSheetService {
  constructor(private readonly http: HttpClient) {}

  getCrosswords(): Observable<Crossword[]> {
    return this.fetchCrosswords();
  }

  getCrosswordById(id: string): Observable<Crossword | undefined> {
    return this.fetchCrosswords().pipe(
      map((crosswords) => crosswords.find((crossword) => crossword.id === id)),
    );
  }

  private fetchCrosswords(): Observable<Crossword[]> {
    const endpoint = `https://docs.google.com/spreadsheets/d/${SHEET_CONFIG.sheetId}/gviz/tq`;
    const params = new HttpParams()
      .set('gid', SHEET_CONFIG.worksheet)
      .set('tqx', 'out:json')
      .set('tq', SHEET_CONFIG.query);

    return this.http.get(endpoint, { params, responseType: 'text' }).pipe(
      map((response) => this.extractPayload(response)),
      map((payload) => {
        const parsed = this.parseRows(payload);
        console.log('parsed', parsed);
        return parsed;
      }),
      map((crosswords) =>
        crosswords
          .filter(
            (crossword) =>
              crossword.id.length > 0 &&
              crossword.title.length > 0 &&
              crossword.puzzleUrl.length > 0,
          )
          .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime()),
      ),
    );
  }

  private extractPayload(rawResponse: string): GvizResponse {
    const start = rawResponse.indexOf('{');
    const end = rawResponse.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error(
        'Unable to parse Google Sheet response. Check sheet visibility and configuration.',
      );
    }

    return JSON.parse(rawResponse.slice(start, end + 1)) as GvizResponse;
  }

  private parseRows(payload: GvizResponse): Crossword[] {
    return (payload.table?.rows ?? []).map((row) => {
      const id = this.getTextValue(row.c[0]);
      const title = this.getTextValue(row.c[1]);
      const publishDate = this.parseDateValue(row.c[2]);
      const difficulty = this.getTextValue(row.c[3]);
      const description = this.getTextValue(row.c[4]);
      const author = this.getTextValue(row.c[5]);
      const puzzleUrl = this.getTextValue(row.c[6]);
      const linkUrl = this.getTextValue(row.c[7]);

      console.log(row, {
        id,
        title,
        publishDate,
        difficulty,
        description,
        author,
        puzzleUrl,
        linkUrl,
      });

      return {
        id,
        title,
        publishDate,
        difficulty,
        description,
        author,
        puzzleUrl,
        linkUrl,
      };
    });
  }

  private getTextValue(cell: GvizCell | null | undefined): string {
    if (!cell || cell.v === null || cell.v === undefined) {
      return '';
    }

    return String(cell.v).trim();
  }

  private parseDateValue(cell: GvizCell | null | undefined): Date {
    if (!cell || cell.v === null || cell.v === undefined) {
      return new Date(0);
    }

    if (typeof cell.v === 'number') {
      return new Date(cell.v);
    }

    const textValue = String(cell.v).trim();
    const gvizDate = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/;
    const matches = textValue.match(gvizDate);

    if (matches) {
      const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = matches;
      return new Date(
        Number(year),
        Number(month),
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
      );
    }

    const parsed = new Date(textValue);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
}
