// supertools_load_image decodes an image file with ImageIO into straight-alpha RGBA8 at its own
// size. Returns a malloc'd buffer (free with supertools_free) or NULL.
#include <ImageIO/ImageIO.h>
#include <CoreGraphics/CoreGraphics.h>
#include <stdlib.h>

unsigned char *supertools_load_image(const char *path, int *out_w, int *out_h) {
	CFURLRef url = CFURLCreateFromFileSystemRepresentation(NULL, (const UInt8 *)path, strlen(path), false);
	if (!url) return NULL;
	CGImageSourceRef src = CGImageSourceCreateWithURL(url, NULL);
	CFRelease(url);
	if (!src) return NULL;
	CGImageRef img = CGImageSourceCreateImageAtIndex(src, 0, NULL);
	CFRelease(src);
	if (!img) return NULL;
	int w = (int)CGImageGetWidth(img), h = (int)CGImageGetHeight(img);
	unsigned char *px = calloc((size_t)w * h, 4);
	CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
	CGContextRef ctx = CGBitmapContextCreate(px, w, h, 8, w * 4, cs, (CGBitmapInfo)kCGImageAlphaPremultipliedLast);
	CGColorSpaceRelease(cs);
	if (!ctx) { CGImageRelease(img); free(px); return NULL; }
	CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), img);
	CGContextRelease(ctx);
	CGImageRelease(img);
	// Un-premultiply: xray images carry straight alpha.
	for (size_t i = 0; i < (size_t)w * h; i++) {
		unsigned char *p = px + i * 4;
		if (p[3] && p[3] < 255) for (int c = 0; c < 3; c++) p[c] = (unsigned char)(p[c] * 255 / p[3]);
	}
	*out_w = w;
	*out_h = h;
	return px;
}

void supertools_free(void *p) { free(p); }
