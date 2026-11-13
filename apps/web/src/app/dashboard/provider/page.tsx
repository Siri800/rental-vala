'use client';

import { useEffect, useState } from 'react';
import { ImageUploader, UploadedImage } from '@/components/ImageUploader';
import { apiFetch } from '@/lib/api';

interface CategorySchema {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
  attributes: {
    id: string;
    key: string;
    label: string;
    dataType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
    isRequired: boolean;
    placeholder?: string;
    optionsJson?: string[];
  }[];
}

export default function ProviderDashboardPage() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<CategorySchema[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dailyRate, setDailyRate] = useState('1500');
  const [securityDeposit, setSecurityDeposit] = useState('5000');
  const [sku, setSku] = useState(`RV-SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [totalQuantity, setTotalQuantity] = useState('2');
  const [city, setCity] = useState('Hyderabad');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [dynamicAttrs, setDynamicAttrs] = useState<Record<string, string | number | boolean>>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState('INDIVIDUAL');
  const [businessAddress, setBusinessAddress] = useState('');
  const [profileCity, setProfileCity] = useState('Hyderabad');
  const [profileState, setProfileState] = useState('Telangana');
  const [profilePinCode, setProfilePinCode] = useState('');

  useEffect(() => {
    apiFetch<{ data: { id: string; businessName: string } }>('/providers/me')
      .then((res) => {
        setProfileReady(true);
        setBusinessName(res.data.businessName);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'Provider profile not found.') {
          setProfileReady(false);
          return;
        }
        setStatusMsg(err instanceof Error ? err.message : 'Could not load provider profile.');
        setProfileReady(null);
      });

    apiFetch<{ data: CategorySchema[] }>('/categories')
      .then((res) => {
        setCategories(res.data);
        if (res.data[0]) {
          setSelectedCategoryId(res.data[0].id);
          setSubcategoryId(res.data[0].subcategories[0]?.id || '');
        }
      })
      .catch((err: unknown) => {
        setStatusMsg(err instanceof Error ? err.message : 'Could not load categories.');
      });
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    apiFetch<{ data: { metrics: Record<string, unknown> } }>('/providers/dashboard')
      .then((res) => setMetrics(res.data.metrics))
      .catch((err: unknown) => {
        setStatusMsg(err instanceof Error ? err.message : 'Could not load provider metrics.');
      });
  }, [profileReady]);

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    if (isImageUploading) {
      setStatusMsg('Wait for your photos to finish uploading before submitting the listing.');
      return;
    }
    try {
      await apiFetch('/providers/profile', {
        method: 'POST',
        body: JSON.stringify({
          businessName,
          ownerName,
          businessType,
          businessAddress,
          city: profileCity,
          state: profileState,
          pinCode: profilePinCode,
        }),
      });
      setProfileReady(true);
      setStatusMsg('Provider profile created. It is now awaiting verification.');
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not create provider profile.');
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    if (uploadedImages.length === 0) {
      setStatusMsg('Upload at least one product photo before submitting your listing.');
      return;
    }
    try {
      await apiFetch('/listings', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          subcategoryId,
          title,
          description,
          city,
          state: 'Telangana',
          pinCode: '500033',
          pickupAddress: 'Plot 42, Jubilee Hills, Hyderabad',
          pickupAvailable: true,
          deliveryAvailable: true,
          instantBooking: true,
          pricing: {
            primaryUnit: 'DAILY',
            dailyRate: Number(dailyRate),
            securityDeposit: Number(securityDeposit),
            deliveryFee: 200,
            taxRatePct: 18,
          },
          policies: {
            cancellationPolicy: 'MODERATE',
            damagePolicy: 'Standard security deposit deduction applies for physical damage.',
          },
          inventory: {
            sku,
            totalQuantity: Number(totalQuantity),
          },
          attributes: dynamicAttrs,
          images: uploadedImages.map((image, index) => ({
            url: image.publicUrl,
            fileKey: image.key,
            altText: image.fileName,
            isPrimary: index === 0,
          })),
        }),
      });
      setStatusMsg('✓ Listing created and submitted for Admin Approval!');
      setTitle('');
      setDescription('');
      setUploadedImages([]);
    } catch (err: unknown) {
      setStatusMsg(`✗ ${err instanceof Error ? err.message : 'Failed to create listing'}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Provider / Vendor Hub</h1>
        <p className="text-sm text-slate-500">
          Publish category-tailored rental listings, manage multi-unit stock, and monitor earnings.
        </p>
      </div>

      {profileReady === false && (
        <form
          onSubmit={handleCreateProfile}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4"
        >
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Set up your provider profile</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add your business details before creating rental listings.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner name" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="INDIVIDUAL">Individual</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="LLP">LLP</option>
              <option value="PRIVATE_LIMITED">Private limited</option>
            </select>
            <input required value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Business address" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input required value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder="City" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input required value={profileState} onChange={(e) => setProfileState(e.target.value)} placeholder="State" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input required pattern="[0-9]{6}" value={profilePinCode} onChange={(e) => setProfilePinCode(e.target.value)} placeholder="6-digit PIN code" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl transition">
            Save Provider Profile
          </button>
        </form>
      )}

      {/* Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Listings</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{String(metrics.totalListings)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase">Published Active</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{String(metrics.activeListings)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase">Gross Revenue</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{Number(metrics.grossRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase">Net Payouts</p>
            <p className="text-2xl font-extrabold text-brand-600 mt-1">
              ₹{Number(metrics.netEarnings || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Category-Specific Listing Form */}
      {profileReady === true && (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-1">
          Publish New Rental Listing (Dynamic Category Form)
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Notice how switching categories automatically updates the required technical fields below.
        </p>

        <form onSubmit={handleCreateListing} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  const nextCat = categories.find((c) => c.id === e.target.value);
                  setSelectedCategoryId(e.target.value);
                  setSubcategoryId(nextCat?.subcategories[0]?.id || '');
                  setDynamicAttrs({});
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory</label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {currentCategory?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Listing Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Canon EOS R5 Mirrorless Body + 24-70mm f/2.8"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
            <textarea
              rows={3}
              required
              placeholder="Include condition, included accessories, and usage notes (min 20 chars)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Dynamic Category Attributes Rendered From Database */}
          {currentCategory && currentCategory.attributes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase text-brand-700">
                {currentCategory.name} Specific Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentCategory.attributes.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {attr.label} {attr.isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {attr.dataType === 'SELECT' ? (
                      <select
                        required={attr.isRequired}
                        value={String(dynamicAttrs[attr.key] || '')}
                        onChange={(e) =>
                          setDynamicAttrs({ ...dynamicAttrs, [attr.key]: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Select {attr.label}</option>
                        {(attr.optionsJson || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : attr.dataType === 'BOOLEAN' ? (
                      <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(dynamicAttrs[attr.key])}
                          onChange={(e) =>
                            setDynamicAttrs({ ...dynamicAttrs, [attr.key]: e.target.checked })
                          }
                        />
                        Yes / Included
                      </label>
                    ) : (
                      <input
                        type={attr.dataType === 'NUMBER' ? 'number' : 'text'}
                        required={attr.isRequired}
                        placeholder={attr.placeholder || ''}
                        value={String(dynamicAttrs[attr.key] || '')}
                        onChange={(e) =>
                          setDynamicAttrs({
                            ...dynamicAttrs,
                            [attr.key]:
                              attr.dataType === 'NUMBER' ? Number(e.target.value) : e.target.value,
                          })
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing & Inventory */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Rate (₹)</label>
              <input
                type="number"
                required
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                required
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Quantity</label>
              <input
                type="number"
                min={1}
                required
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inventory SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <ImageUploader
            images={uploadedImages}
            onChange={setUploadedImages}
            onUploadingChange={setIsImageUploading}
          />

          {statusMsg && (
            <p className="text-sm font-semibold p-3 rounded-lg bg-slate-100 text-slate-800">
              {statusMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isImageUploading}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Submit Listing for Approval
          </button>
        </form>
      </div>
      )}
    </div>
  );
}