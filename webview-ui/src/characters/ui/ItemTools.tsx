/**
 * The pixel editor's Item section: the edited piece as a PNG (export, import) and as a
 * wardrobe item of its own (save as new, delete). Files are the piece alone, uncoloured,
 * all 24 frames in the sheet layout: the same form as the wardrobe's own art. A sheet from
 * before the seated frame (112x96) still imports: its seated frame is derived.
 */

import { useState } from 'react';

import { isItemId, MAX_WARDROBE_ITEMS } from '../../../../core/src/wardrobeItems.js';
import { dataLabel } from '../../i18n/dataLabels.js';
import { t, useT } from '../../i18n/index.js';
import { castStore, registerItemArt } from '../castStore.js';
import {
  importPieceSheet,
  itemFrom,
  itemPieceOf,
  pieceName,
  pieceSheet,
  wearNewItem,
} from '../items.js';
import { decodePng } from '../loadWardrobe.js';
import { fileBaseName } from '../profiles.js';
import { decodeSheet, SHEET_H, SHEET_W } from '../sheet.js';
import { partLabel } from '../wardrobe.js';
import { ArmedButton } from './ArmedButton.js';
import { pickFiles, saveFile, sheetPng, sheetPngBase64 } from './files.js';
import { useStudio } from './studio.js';

export function ItemTools() {
  const { renderer, profile, editor, cast, status, phone } = useStudio();
  const pix = editor!.pix;
  const piece = itemPieceOf(pix);
  const worn = piece ? profile[piece] : undefined;
  const wornLabel = piece ? dataLabel(partLabel(renderer.wardrobe, piece, worn)) : '';
  // keyed by the worn part, so the name starts over when it changes
  return (
    <ItemSection
      key={`${pix}:${worn ?? ''}`}
      defaultName={piece && worn ? `${wornLabel} 2` : ''}
      canSaveItem={!!piece && !!worn}
      custom={isItemId(worn) ? worn! : null}
      customLabel={wornLabel}
      onExport={async () => {
        const sheet = pieceSheet(renderer, profile, pix);
        if (!sheet) return;
        const filename = `${fileBaseName(profile, cast.current)}-${pieceName(renderer, profile, pix)}.png`;
        await saveFile(filename, await sheetPng(sheet));
        status(t('item.saved', { file: filename }), 'ok');
      }}
      onImport={() =>
        pickFiles('.png,image/png', false, ([file]) => {
          if (!file) return;
          const url = URL.createObjectURL(file);
          void decodePng(url)
            .then((img) => {
              const sheet = decodeSheet(img);
              if (!sheet) {
                status(
                  t('item.wrongSize', {
                    file: file.name,
                    w: img.width,
                    h: img.height,
                    sw: SHEET_W,
                    sh: SHEET_H,
                  }),
                  'err',
                );
                return;
              }
              castStore.update((p) => importPieceSheet(renderer, p, pix, sheet), editor!.frame);
              status(
                t('item.loaded', {
                  file: file.name,
                  piece: dataLabel(pieceName(renderer, profile, pix)),
                }),
                'ok',
              );
            })
            .catch(() => status(t('item.notPng', { file: file.name }), 'err'))
            .finally(() => URL.revokeObjectURL(url));
        })
      }
      onSaveItem={(name) => {
        if (!piece) return;
        const sheet = pieceSheet(renderer, profile, pix);
        if (!sheet) return;
        const data = new Uint8ClampedArray(sheet);
        const item = itemFrom(renderer, profile, piece, name, sheetPngBase64(data));
        if (!item) return;
        registerItemArt(item.id, data);
        if (!castStore.addItem(item, (p) => wearNewItem(p, item))) {
          status(t('item.wardrobeFull', { max: MAX_WARDROBE_ITEMS }), 'err');
          return;
        }
        status(t('item.added', { name: item.label }), 'ok');
      }}
      onDelete={(id) => castStore.removeItem(id)}
      phone={phone}
    />
  );
}

function ItemSection(props: {
  defaultName: string;
  canSaveItem: boolean;
  custom: string | null;
  customLabel: string;
  onExport: () => Promise<void>;
  onImport: () => void;
  onSaveItem: (name: string) => void;
  onDelete: (id: string) => void;
  phone: boolean;
}) {
  const [name, setName] = useState(props.defaultName);
  const tr = useT();
  return (
    <div className="chv-ed-item">
      <h3>{tr('item.title')}</h3>
      <div className="chv-toolrow">
        <button type="button" className="chv-tool" onClick={() => void props.onExport()}>
          {tr('item.exportPng')}
        </button>
        <button type="button" className="chv-tool" onClick={props.onImport}>
          {tr('item.importPng')}
        </button>
      </div>
      {props.canSaveItem && (
        <form
          className="chv-ed-item-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) props.onSaveItem(name);
          }}
        >
          <input
            value={name}
            maxLength={64}
            aria-label={tr('item.newNameLabel')}
            placeholder={tr('item.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="chv-tool" disabled={!name.trim()}>
            {tr('item.saveAsNew')}
          </button>
        </form>
      )}
      {props.custom && (
        <div className="chv-toolrow">
          <ArmedButton
            className="chv-tool"
            label={tr('item.deleteNamed', { name: props.customLabel })}
            confirmLabel={tr(props.phone ? 'common.tapAgain' : 'item.clickAgainDelete')}
            onConfirm={() => props.onDelete(props.custom!)}
          />
        </div>
      )}
      <p className="chv-note">{tr('item.note', { w: SHEET_W, h: SHEET_H })}</p>
    </div>
  );
}
