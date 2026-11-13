import {
  PrismaClient,
  RoleType,
  AttributeDataType,
  UserStatus,
  ProviderVerificationStatus,
  BusinessType,
  ListingStatus,
  ProductCondition,
  PricingUnit,
  InventoryUnitStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Deterministic SHA-256 + salt helper for seed passwords (API uses Argon2id)
function hashSeedPassword(password: string): string {
  const salt = 'rv_seed_salt_2026';
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const CATEGORIES_DATA = [
  {
    name: 'Vehicles',
    slug: 'vehicles',
    iconName: 'Car',
    commission: 12.0,
    description: 'Rent self-drive cars, bikes, scooters, SUVs, bicycles, and commercial vehicles.',
    subcategories: ['Cars', 'Bikes', 'Scooters', 'SUVs', 'Commercial Vehicles', 'Bicycles'],
    attributes: [
      { key: 'vehicle_type', label: 'Vehicle Type', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Hatchback', 'Sedan', 'SUV', 'Cruiser Bike', 'Commuter Scooter', 'Electric', 'Commercial Van'] },
      { key: 'registration_number', label: 'Registration Number', dataType: AttributeDataType.TEXT, isRequired: true, isFilterable: false, placeholder: 'TS09AB1234' },
      { key: 'fuel_type', label: 'Fuel Type', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'] },
      { key: 'transmission', label: 'Transmission', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Manual', 'Automatic'] },
      { key: 'insurance_valid', label: 'Comprehensive Insurance Active', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
      { key: 'permitted_usage', label: 'Permitted Usage', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['City Limits Only', 'Outstation Allowed', 'Commercial Permitted'] },
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    iconName: 'Camera',
    commission: 10.0,
    description: 'High-end cameras, lenses, laptops, projectors, audio rigs, and gaming consoles.',
    subcategories: ['Cameras', 'Laptops', 'Mobile Devices', 'Projectors', 'Audio Equipment', 'Gaming Devices'],
    attributes: [
      { key: 'specifications', label: 'Key Specifications', dataType: AttributeDataType.TEXT, isRequired: true, isFilterable: false, placeholder: '24.2MP Full-Frame, 4K 60fps' },
      { key: 'warranty_or_protection', label: 'Accidental Damage Cover Included', dataType: AttributeDataType.BOOLEAN, isRequired: false, isFilterable: true },
      { key: 'accessories_included', label: 'Included Accessories', dataType: AttributeDataType.TEXT, isRequired: true, isFilterable: false, placeholder: '2 Batteries, Charger, 64GB SD Card, Carry Bag' },
    ],
  },
  {
    name: 'Furniture',
    slug: 'furniture',
    iconName: 'Sofa',
    commission: 10.0,
    description: 'Flexible home and office furniture rentals for apartments, startups, and studios.',
    subcategories: ['Sofas', 'Beds', 'Tables', 'Chairs', 'Office Furniture', 'Home Furniture'],
    attributes: [
      { key: 'material', label: 'Primary Material', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Solid Wood', 'Engineered Wood', 'Metal', 'Fabric', 'Leatherette'] },
      { key: 'seating_capacity', label: 'Seating / User Capacity', dataType: AttributeDataType.NUMBER, isRequired: false, isFilterable: true, unit: 'persons' },
      { key: 'assembly_included', label: 'Free Assembly & Dismantling', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
  {
    name: 'Home Appliances',
    slug: 'home-appliances',
    iconName: 'Refrigerator',
    commission: 9.0,
    description: 'Refrigerators, washing machines, air conditioners, smart TVs, and kitchen essentials.',
    subcategories: ['Refrigerators', 'Washing Machines', 'Air Conditioners', 'Televisions', 'Kitchen Appliances'],
    attributes: [
      { key: 'capacity_rating', label: 'Capacity / Size', dataType: AttributeDataType.TEXT, isRequired: true, isFilterable: false, placeholder: '260 Litres / 1.5 Ton / 55 Inch' },
      { key: 'energy_star_rating', label: 'Energy Star Rating', dataType: AttributeDataType.SELECT, isRequired: false, isFilterable: true, optionsJson: ['3 Star', '4 Star', '5 Star', 'Inverter'] },
      { key: 'installation_included', label: 'Standard Installation Included', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
  {
    name: 'Tools & Equipment',
    slug: 'tools-equipment',
    iconName: 'Wrench',
    commission: 11.0,
    description: 'Heavy-duty power tools, construction gear, industrial machinery, and garden tools.',
    subcategories: ['Power Tools', 'Construction Equipment', 'Industrial Equipment', 'Gardening Tools', 'Cleaning Equipment'],
    attributes: [
      { key: 'power_source', label: 'Power Source', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Corded Electric (220V)', 'Cordless Battery', 'Diesel / Petrol', 'Pneumatic', 'Manual'] },
      { key: 'wattage_or_hp', label: 'Power Output', dataType: AttributeDataType.TEXT, isRequired: false, isFilterable: false, placeholder: '1500W / 5 HP' },
      { key: 'operator_available', label: 'Trained Operator Available', dataType: AttributeDataType.BOOLEAN, isRequired: false, isFilterable: true },
    ],
  },
  {
    name: 'Event & Party',
    slug: 'event-party',
    iconName: 'PartyPopper',
    commission: 12.0,
    description: 'Complete event production gear: sound systems, stage lighting, tents, decor, and seating.',
    subcategories: ['Wedding Equipment', 'Sound Systems', 'Lighting', 'Decoration', 'Tables and Chairs', 'Event Tents'],
    attributes: [
      { key: 'guest_coverage', label: 'Recommended Guest Capacity', dataType: AttributeDataType.NUMBER, isRequired: true, isFilterable: true, unit: 'guests' },
      { key: 'setup_requirements', label: 'Setup & Power Requirements', dataType: AttributeDataType.TEXT, isRequired: true, isFilterable: false, placeholder: 'Requires 3-phase power and 2 hours setup window' },
      { key: 'technician_included', label: 'On-Site Technician Included', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    iconName: 'Shirt',
    commission: 15.0,
    description: 'Designer outfits, bridal and wedding wear, luxury watches, handbags, and accessories.',
    subcategories: ['Designer Clothing', 'Wedding Wear', 'Traditional Clothing', 'Accessories', 'Watches', 'Bags'],
    attributes: [
      { key: 'size', label: 'Size', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'] },
      { key: 'gender', label: 'Category', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Women', 'Men', 'Unisex'] },
      { key: 'dry_cleaning_included', label: 'Dry Cleaning Included in Price', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
  {
    name: 'Sports & Outdoor',
    slug: 'sports-outdoor',
    iconName: 'Bike',
    commission: 10.0,
    description: 'Home gym equipment, treadmills, trekking gear, bicycles, and team sports kits.',
    subcategories: ['Gym Equipment', 'Camping Equipment', 'Bicycles', 'Sports Gear', 'Outdoor Equipment'],
    attributes: [
      { key: 'skill_level', label: 'Usage Grade', dataType: AttributeDataType.SELECT, isRequired: false, isFilterable: true, optionsJson: ['Beginner / Home', 'Intermediate', 'Professional / Commercial'] },
      { key: 'weight_capacity_kg', label: 'Max User Weight', dataType: AttributeDataType.NUMBER, isRequired: false, isFilterable: false, unit: 'kg' },
    ],
  },
  {
    name: 'Baby & Kids',
    slug: 'baby-kids',
    iconName: 'Baby',
    commission: 10.0,
    description: 'Sanitized baby strollers, cribs, car seats, and developmental toys for growing families.',
    subcategories: ['Baby Strollers', 'Baby Beds', 'Toys', 'Baby Car Seats', 'Kids Equipment'],
    attributes: [
      { key: 'age_group', label: 'Recommended Age Group', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['0-6 Months', '6-18 Months', '1.5-3 Years', '3-6 Years', '6+ Years'] },
      { key: 'hospital_grade_sanitized', label: 'Hospital-Grade Steam Sanitized', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
  {
    name: 'Travel',
    slug: 'travel',
    iconName: 'Luggage',
    commission: 10.0,
    description: 'Hard-shell luggage, trekking backpacks, camping tents, and international travel adapters.',
    subcategories: ['Travel Bags', 'Camping Gear', 'Travel Accessories', 'Outdoor Travel Equipment'],
    attributes: [
      { key: 'capacity_litres', label: 'Volume / Capacity', dataType: AttributeDataType.NUMBER, isRequired: false, isFilterable: true, unit: 'Litres' },
      { key: 'weatherproof', label: 'Waterproof / All-Weather Rated', dataType: AttributeDataType.BOOLEAN, isRequired: false, isFilterable: true },
    ],
  },
  {
    name: 'Property & Spaces',
    slug: 'property-spaces',
    iconName: 'Building2',
    commission: 8.0,
    description: 'Furnished apartments, coworking offices, podcast/photo studios, event halls, and storage.',
    subcategories: ['Apartments', 'Houses', 'Offices', 'Meeting Rooms', 'Studios', 'Event Spaces', 'Storage Spaces'],
    attributes: [
      { key: 'area_sqft', label: 'Carpet Area', dataType: AttributeDataType.NUMBER, isRequired: true, isFilterable: true, unit: 'sq.ft' },
      { key: 'max_occupancy', label: 'Maximum Occupancy', dataType: AttributeDataType.NUMBER, isRequired: true, isFilterable: true, unit: 'people' },
      { key: 'amenities', label: 'Amenities', dataType: AttributeDataType.MULTI_SELECT, isRequired: false, isFilterable: true, optionsJson: ['High-Speed Wi-Fi', 'Air Conditioning', 'Power Backup', 'Parking', 'Security 24x7', 'Pantry'] },
      { key: 'permitted_usage', label: 'Permitted Space Usage', dataType: AttributeDataType.SELECT, isRequired: true, isFilterable: true, optionsJson: ['Residential', 'Commercial Office', 'Shoot / Production', 'Private Event', 'Warehousing / Storage'] },
    ],
  },
  {
    name: 'Business & Professional Equipment',
    slug: 'business-professional-equipment',
    iconName: 'Briefcase',
    commission: 9.0,
    description: 'Home-care medical equipment, cinema production gear, office copiers, and commercial machinery.',
    subcategories: ['Medical Equipment', 'Photography Equipment', 'Office Equipment', 'Commercial Equipment', 'Professional Machinery'],
    attributes: [
      { key: 'certification', label: 'Safety / Calibration Certification', dataType: AttributeDataType.TEXT, isRequired: false, isFilterable: false, placeholder: 'ISO / Medical Grade Certified' },
      { key: 'amc_support', label: '24/7 Replacement & Maintenance Support', dataType: AttributeDataType.BOOLEAN, isRequired: true, isFilterable: true },
    ],
  },
];

async function main() {
  console.log('Starting Rental Vala database seed...');

  // 1. Seed Roles
  const roleNames: RoleType[] = [
    RoleType.CUSTOMER,
    RoleType.PROVIDER,
    RoleType.SUPER_ADMIN,
    RoleType.OPERATIONS_ADMIN,
    RoleType.FINANCE_ADMIN,
    RoleType.SUPPORT_ADMIN,
    RoleType.CONTENT_ADMIN,
  ];

  const roleMap: Record<string, string> = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} system role` },
    });
    roleMap[name] = role.id;
  }

  // 2. Seed Users (Super Admin, Customer, 2 Approved Providers)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rentalvala.in' },
    update: {},
    create: {
      email: 'admin@rentalvala.in',
      phone: '9000000001',
      passwordHash: hashSeedPassword('Admin@1234'),
      fullName: 'Vikramaditya Rao (Super Admin)',
      emailVerified: true,
      phoneVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: roleMap[RoleType.SUPER_ADMIN] }] },
      adminUser: { create: { department: 'Executive Operations' } },
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@rentalvala.in' },
    update: {},
    create: {
      email: 'customer@rentalvala.in',
      phone: '9000000002',
      passwordHash: hashSeedPassword('Customer@1234'),
      fullName: 'Ananya Sharma',
      emailVerified: true,
      phoneVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: roleMap[RoleType.CUSTOMER] }] },
      customerProfile: { create: { kycVerified: true } },
      wishlists: { create: {} },
    },
  });

  const providerUser1 = await prisma.user.upsert({
    where: { email: 'provider.tech@rentalvala.in' },
    update: {},
    create: {
      email: 'provider.tech@rentalvala.in',
      phone: '9000000003',
      passwordHash: hashSeedPassword('Provider@1234'),
      fullName: 'Karthik Reddy',
      emailVerified: true,
      phoneVerified: true,
      status: UserStatus.ACTIVE,
      roles: { create: [{ roleId: roleMap[RoleType.PROVIDER] }] },
      providerProfile: {
        create: {
          businessName: 'Deccan Pro Gear & Mobility Rentals',
          slug: 'deccan-pro-gear-mobility',
          ownerName: 'Karthik Reddy',
          businessType: BusinessType.PRIVATE_LIMITED,
          description: 'Authorized cinema camera, laptop, and premium vehicle rental hub in Hyderabad.',
          gstNumber: '36AABCD1234E1Z5',
          businessAddress: 'Plot 42, Jubilee Hills Road No. 36',
          city: 'Hyderabad',
          state: 'Telangana',
          pinCode: '500033',
          verificationStatus: ProviderVerificationStatus.APPROVED,
          averageRating: 4.85,
          totalReviews: 48,
          verifiedAt: new Date(),
        },
      },
    },
    include: { providerProfile: true },
  });
  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser1.id },
    update: {},
    create: {
      userId: providerUser1.id,
      businessName: 'Deccan Pro Gear & Mobility Rentals',
      slug: 'deccan-pro-gear-mobility',
      ownerName: 'Karthik Reddy',
      businessType: BusinessType.PRIVATE_LIMITED,
      description: 'Authorized camera, equipment, and vehicle rental hub in Hyderabad.',
      businessAddress: 'Plot 42, Jubilee Hills Road No. 36',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500033',
      verificationStatus: ProviderVerificationStatus.APPROVED,
      verifiedAt: new Date(),
    },
  });
  const providerProfilesByCity: Record<string, { id: string; state: string; pinCode: string }> = {
    Hyderabad: { id: providerProfile.id, state: 'Telangana', pinCode: '500033' },
  };
  const additionalProviders = [
    { city: 'Bengaluru', state: 'Karnataka', pinCode: '560001', phone: '9110000004' },
    { city: 'Mumbai', state: 'Maharashtra', pinCode: '400001', phone: '9110000005' },
    { city: 'Delhi NCR', state: 'Delhi', pinCode: '110001', phone: '9110000006' },
    { city: 'Chennai', state: 'Tamil Nadu', pinCode: '600001', phone: '9110000007' },
    { city: 'Pune', state: 'Maharashtra', pinCode: '411001', phone: '9110000008' },
  ];
  for (const location of additionalProviders) {
    const slug = `rental-vala-${location.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-rentals`;
    const user = await prisma.user.upsert({
      where: { email: `provider.${location.city.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@rentalvala.in` },
      update: {},
      create: {
        email: `provider.${location.city.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@rentalvala.in`,
        phone: location.phone,
        passwordHash: hashSeedPassword('Provider@1234'),
        fullName: `Rental Vala ${location.city} Provider`,
        emailVerified: true,
        phoneVerified: true,
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roleMap[RoleType.PROVIDER] }] },
      },
    });
    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        businessName: `Citywide Rentals ${location.city}`,
        city: location.city,
        state: location.state,
        pinCode: location.pinCode,
        verificationStatus: ProviderVerificationStatus.APPROVED,
      },
      create: {
        userId: user.id,
        businessName: `Citywide Rentals ${location.city}`,
        slug,
        ownerName: `Rental Vala ${location.city} Provider`,
        businessType: BusinessType.INDIVIDUAL,
        description: `Verified local rental provider serving ${location.city}.`,
        businessAddress: `Central ${location.city}, India`,
        city: location.city,
        state: location.state,
        pinCode: location.pinCode,
        verificationStatus: ProviderVerificationStatus.APPROVED,
        verifiedAt: new Date(),
      },
    });
    providerProfilesByCity[location.city] = {
      id: profile.id,
      state: location.state,
      pinCode: location.pinCode,
    };
  }

  // 3. Seed All 12 Categories, Subcategories & Dynamic Attributes
  for (let i = 0; i < CATEGORIES_DATA.length; i++) {
    const cat = CATEGORIES_DATA[i];
    const createdCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        iconName: cat.iconName,
        defaultCommissionPct: cat.commission,
        displayOrder: i + 1,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        iconName: cat.iconName,
        defaultCommissionPct: cat.commission,
        displayOrder: i + 1,
      },
    });

    for (const subName of cat.subcategories) {
      const subSlug = subName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: createdCat.id, slug: subSlug } },
        update: { name: subName },
        create: {
          categoryId: createdCat.id,
          name: subName,
          slug: subSlug,
        },
      });
    }

    for (let aIdx = 0; aIdx < cat.attributes.length; aIdx++) {
      const attr = cat.attributes[aIdx];
      await prisma.categoryAttribute.upsert({
        where: { categoryId_key: { categoryId: createdCat.id, key: attr.key } },
        update: {
          label: attr.label,
          dataType: attr.dataType,
          isRequired: attr.isRequired,
          isFilterable: attr.isFilterable,
          optionsJson: 'optionsJson' in attr ? attr.optionsJson : undefined,
          unit: (attr as { unit?: string }).unit ?? undefined,
          placeholder: (attr as { placeholder?: string }).placeholder ?? undefined,
          displayOrder: aIdx + 1,
        },
        create: {
          categoryId: createdCat.id,
          key: attr.key,
          label: attr.label,
          dataType: attr.dataType,
          isRequired: attr.isRequired,
          isFilterable: attr.isFilterable,
          optionsJson: 'optionsJson' in attr ? attr.optionsJson : undefined,
          unit: (attr as { unit?: string }).unit ?? undefined,
          placeholder: (attr as { placeholder?: string }).placeholder ?? undefined,
          displayOrder: aIdx + 1,
        },
      });
    }
  }

  // Policies do not carry rental-duration columns in this schema; duration limits
  // belong to ListingPricing.minDuration and ListingPricing.maxDuration.
  const sampleListings = [
    {
      slug: 'sony-fx3-full-frame-cinema-camera-kit',
      title: 'Sony FX3 Full-Frame Cinema Line Camera Kit',
      description: 'Sony FX3 cinema camera with XLR handle, spare batteries, CFexpress media, and a hard case.',
      categorySlug: 'electronics', subcategorySlug: 'cameras', city: 'Hyderabad',
      brand: 'Sony', model: 'ILME-FX3', condition: ProductCondition.LIKE_NEW,
      dailyRate: 2500, weeklyRate: 14500, monthlyRate: 48000, securityDeposit: 10000, deliveryFee: 250,
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Sony FX3 cinema camera kit', unitCount: 4,
      unitSerials: ['SN-FX3-9001', 'SN-FX3-9002', 'SN-FX3-9003', 'SN-FX3-9004'],
      attributes: { specifications: '12.1MP full-frame, 4K 120fps, XLR audio handle', warranty_or_protection: true, accessories_included: 'XLR handle, two batteries, CFexpress card, hard case' },
    },
    {
      slug: 'mahindra-thar-4x4-automatic',
      title: 'Mahindra Thar 4x4 Automatic',
      description: 'Well-maintained automatic 4x4 SUV for city drives and approved outstation trips.',
      categorySlug: 'vehicles', subcategorySlug: 'suvs', city: 'Hyderabad',
      brand: 'Mahindra', model: 'Thar', condition: ProductCondition.GOOD,
      dailyRate: 6500, weeklyRate: 39000, monthlyRate: 120000, securityDeposit: 20000, deliveryFee: 500,
      imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=85',
      imageAlt: '4x4 SUV available for rent', unitCount: 2,
      attributes: { vehicle_type: 'SUV', registration_number: 'TS09AB7421', fuel_type: 'Diesel', transmission: 'Automatic', insurance_valid: true, permitted_usage: 'Outstation Allowed' },
    },
    {
      slug: 'canon-eos-r5-mirrorless-camera-kit',
      title: 'Canon EOS R5 Mirrorless Camera Kit',
      description: 'Canon EOS R5 with a versatile zoom lens, spare battery, charger, and carry case.',
      categorySlug: 'electronics', subcategorySlug: 'cameras', city: 'Hyderabad',
      brand: 'Canon', model: 'EOS R5', condition: ProductCondition.LIKE_NEW,
      dailyRate: 3000, weeklyRate: 17500, monthlyRate: 52000, securityDeposit: 12000, deliveryFee: 200,
      imageUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Canon mirrorless camera kit', unitCount: 2,
      attributes: { specifications: '45MP full-frame, 8K RAW video, in-body stabilization', warranty_or_protection: true, accessories_included: 'RF zoom lens, two batteries, charger, carry case' },
    },
    {
      slug: 'bengaluru-ergonomic-mesh-office-chair',
      title: 'Ergonomic Mesh Office Chair',
      description: 'Adjustable ergonomic chair with lumbar support, breathable mesh, and smooth casters.',
      categorySlug: 'furniture', subcategorySlug: 'chairs', city: 'Bengaluru',
      brand: 'Featherlite', model: 'Liberate', condition: ProductCondition.GOOD,
      dailyRate: 350, weeklyRate: 1800, monthlyRate: 5200, securityDeposit: 3000, deliveryFee: 250,
      imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Ergonomic office chair', unitCount: 3,
      attributes: { material: 'Metal', seating_capacity: 1, assembly_included: true },
    },
    {
      slug: 'bengaluru-inverter-air-conditioner',
      title: '1.5 Ton 5-Star Inverter Air Conditioner',
      description: 'Energy-efficient split AC with installation, remote, and routine service support.',
      categorySlug: 'home-appliances', subcategorySlug: 'air-conditioners', city: 'Bengaluru',
      brand: 'Daikin', model: 'FTKM50', condition: ProductCondition.GOOD,
      dailyRate: 700, weeklyRate: 4200, monthlyRate: 12500, securityDeposit: 8000, deliveryFee: 500,
      imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Split air conditioner unit', unitCount: 2,
      attributes: { capacity_rating: '1.5 Ton inverter split AC', energy_star_rating: '5 Star', installation_included: true },
    },
    {
      slug: 'mumbai-cordless-professional-drill-kit',
      title: 'Cordless Professional Drill and Driver Kit',
      description: '18V cordless drill with two batteries, charger, and a complete bit set for home projects.',
      categorySlug: 'tools-equipment', subcategorySlug: 'power-tools', city: 'Mumbai',
      brand: 'Bosch', model: 'GSR 185-LI', condition: ProductCondition.GOOD,
      dailyRate: 450, weeklyRate: 2400, monthlyRate: 7500, securityDeposit: 4000, deliveryFee: 180,
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Cordless power drill and tools', unitCount: 3,
      attributes: { power_source: 'Cordless Battery', wattage_or_hp: '18V brushless motor', operator_available: false },
    },
    {
      slug: 'mumbai-professional-event-pa-sound-system',
      title: 'Professional Event PA Sound System',
      description: 'Pair of powered speakers, digital mixer, wireless microphones, delivery, and setup support.',
      categorySlug: 'event-party', subcategorySlug: 'sound-systems', city: 'Mumbai',
      brand: 'JBL', model: 'EON715 PA Package', condition: ProductCondition.GOOD,
      dailyRate: 8500, weeklyRate: 48000, monthlyRate: 150000, securityDeposit: 25000, deliveryFee: 1200,
      imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Professional event stage and sound setup', unitCount: 2,
      attributes: { guest_coverage: 250, setup_requirements: 'Two power outlets; allow 90 minutes for setup and sound check.', technician_included: true },
    },
    {
      slug: 'delhi-designer-wedding-lehenga',
      title: 'Designer Embroidered Wedding Lehenga',
      description: 'Occasion-wear embroidered lehenga with blouse and dupatta; professional dry cleaning included.',
      categorySlug: 'fashion', subcategorySlug: 'wedding-wear', city: 'Delhi NCR',
      brand: 'Aza Studio', model: 'Zari Bridal Set', condition: ProductCondition.LIKE_NEW,
      dailyRate: 4500, weeklyRate: 24000, monthlyRate: 65000, securityDeposit: 15000, deliveryFee: 300,
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Designer occasion wear outfit', unitCount: 2,
      attributes: { size: 'L', gender: 'Women', dry_cleaning_included: true },
    },
    {
      slug: 'delhi-commercial-treadmill',
      title: 'Commercial Folding Treadmill',
      description: 'Serviced gym treadmill with incline control, safety key, and floor-protection mat.',
      categorySlug: 'sports-outdoor', subcategorySlug: 'gym-equipment', city: 'Delhi NCR',
      brand: 'PowerMax', model: 'TDA-350', condition: ProductCondition.GOOD,
      dailyRate: 1100, weeklyRate: 6000, monthlyRate: 18000, securityDeposit: 12000, deliveryFee: 800,
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Commercial gym treadmill', unitCount: 2,
      attributes: { skill_level: 'Professional / Commercial', weight_capacity_kg: 150 },
    },
    {
      slug: 'chennai-all-terrain-baby-stroller',
      title: 'All-Terrain Compact Baby Stroller',
      description: 'Sanitized compact stroller with sun canopy, adjustable harness, and large storage basket.',
      categorySlug: 'baby-kids', subcategorySlug: 'baby-strollers', city: 'Chennai',
      brand: 'Babyhug', model: 'Easy Travel', condition: ProductCondition.GOOD,
      dailyRate: 500, weeklyRate: 2800, monthlyRate: 8000, securityDeposit: 3500, deliveryFee: 150,
      imageUrl: 'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Compact baby stroller', unitCount: 3,
      attributes: { age_group: '6-18 Months', hospital_grade_sanitized: true },
    },
    {
      slug: 'chennai-75-litre-hard-shell-travel-luggage',
      title: '75-Litre Hard-Shell Travel Luggage Set',
      description: 'Durable spinner luggage set with combination locks, expandable compartments, and rain covers.',
      categorySlug: 'travel', subcategorySlug: 'travel-bags', city: 'Chennai',
      brand: 'American Tourister', model: 'Curio 75L', condition: ProductCondition.GOOD,
      dailyRate: 300, weeklyRate: 1600, monthlyRate: 4500, securityDeposit: 2500, deliveryFee: 100,
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Travel luggage and backpack', unitCount: 4,
      attributes: { capacity_litres: 75, weatherproof: true },
    },
    {
      slug: 'pune-sound-treated-podcast-studio',
      title: 'Sound-Treated Podcast and Creator Studio',
      description: 'Daylight studio with acoustic treatment, fast Wi-Fi, air conditioning, and backup power.',
      categorySlug: 'property-spaces', subcategorySlug: 'studios', city: 'Pune',
      brand: 'Studio Commons', model: 'Creator Room A', condition: ProductCondition.GOOD,
      dailyRate: 6000, weeklyRate: 33000, monthlyRate: 95000, securityDeposit: 10000, deliveryFee: 0,
      imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Bright professional studio workspace', unitCount: 1,
      attributes: { area_sqft: 600, max_occupancy: 8, amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'Power Backup'], permitted_usage: 'Shoot / Production' },
    },
    {
      slug: 'pune-portable-oxygen-concentrator',
      title: 'Portable Medical Oxygen Concentrator',
      description: 'Calibrated medical-grade oxygen concentrator with cannula set and replacement support.',
      categorySlug: 'business-professional-equipment', subcategorySlug: 'medical-equipment', city: 'Pune',
      brand: 'Philips', model: 'EverFlo', condition: ProductCondition.GOOD,
      dailyRate: 1800, weeklyRate: 9800, monthlyRate: 28000, securityDeposit: 15000, deliveryFee: 350,
      imageUrl: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1600&q=85',
      imageAlt: 'Medical equipment for home care', unitCount: 2,
      attributes: { certification: 'Medical-grade device; serviced and safety checked.', amc_support: true },
    },
  ];

  for (const sample of sampleListings) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: sample.categorySlug },
      include: { attributes: true },
    });
    const subcategory = await prisma.subcategory.findFirstOrThrow({
      where: {
        categoryId: category.id,
        slug: sample.subcategorySlug,
      },
    });
    const city = providerProfilesByCity[sample.city];
    if (!city) throw new Error(`Missing seeded provider for ${sample.city}.`);

    const listing = await prisma.listing.upsert({
      where: { slug: sample.slug },
      update: {
        providerId: city.id,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        title: sample.title,
        description: sample.description,
        brand: sample.brand,
        model: sample.model,
        condition: sample.condition,
        city: sample.city,
        state: city.state,
        pinCode: city.pinCode,
        pickupAddress: `Central ${sample.city}, India`,
        pickupAvailable: true,
        deliveryAvailable: true,
        deliveryRadiusKm: 25,
        instantBooking: true,
        status: ListingStatus.PUBLISHED,
        deletedAt: null,
      },
      create: {
        providerId: city.id,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        title: sample.title,
        slug: sample.slug,
        description: sample.description,
        brand: sample.brand,
        model: sample.model,
        condition: sample.condition,
        city: sample.city,
        state: city.state,
        pinCode: city.pinCode,
        pickupAddress: `Central ${sample.city}, India`,
        pickupAvailable: true,
        deliveryAvailable: true,
        deliveryRadiusKm: 25,
        instantBooking: true,
        status: ListingStatus.PUBLISHED,
      },
    });

    const pricingData = {
      primaryUnit: PricingUnit.DAILY,
      dailyRate: sample.dailyRate,
      weeklyRate: sample.weeklyRate,
      monthlyRate: sample.monthlyRate,
      securityDeposit: sample.securityDeposit,
      deliveryFee: sample.deliveryFee,
      taxRatePct: 18,
      minDuration: 1,
      maxDuration: 30,
      weeklyDiscountPct: 10,
      monthlyDiscountPct: 15,
    };
    await prisma.listingPricing.upsert({
      where: { listingId: listing.id },
      update: pricingData,
      create: { listingId: listing.id, ...pricingData },
    });

    const policyData = {
      cancellationPolicy: 'MODERATE',
      cancellationNotes: 'Free cancellation up to 24 hours before the rental starts.',
      damagePolicy: 'Customer is responsible for damage beyond normal wear.',
      usageGuidelines: 'Use the item only for its stated intended purpose and return it on time.',
      lateFeePerDay: sample.dailyRate,
      idProofRequired: true,
    };
    await prisma.listingPolicy.upsert({
      where: { listingId: listing.id },
      update: policyData,
      create: { listingId: listing.id, ...policyData },
    });

    const inventoryData = {
      sku: `RV-${sample.city.slice(0, 3).toUpperCase()}-${sample.slug.slice(-12).toUpperCase()}`,
      totalQuantity: sample.unitCount,
      trackIndividualUnits: true,
      bufferHours: 2,
    };
    const inventory = await prisma.inventoryItem.upsert({
      where: { listingId: listing.id },
      update: inventoryData,
      create: { listingId: listing.id, ...inventoryData },
    });

    for (let unitNumber = 1; unitNumber <= sample.unitCount; unitNumber++) {
      const serialNumber =
        sample.unitSerials?.[unitNumber - 1] ??
        `${sample.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}-${String(unitNumber).padStart(3, '0')}`;
      await prisma.inventoryUnit.upsert({
        where: {
          inventoryItemId_serialNumber: {
            inventoryItemId: inventory.id,
            serialNumber,
          },
        },
        update: {
          status: InventoryUnitStatus.AVAILABLE,
          assetTag: `${inventory.sku}-${String(unitNumber).padStart(2, '0')}`,
        },
        create: {
          inventoryItemId: inventory.id,
          serialNumber,
          assetTag: `${inventory.sku}-${String(unitNumber).padStart(2, '0')}`,
          status: InventoryUnitStatus.AVAILABLE,
        },
      });
    }

    const existingImage = await prisma.listingImage.findFirst({
      where: { listingId: listing.id },
      select: { id: true },
    });
    await prisma.listingImage.upsert({
      where: { id: existingImage?.id ?? crypto.randomUUID() },
      update: {
        url: sample.imageUrl,
        altText: sample.imageAlt,
        fileKey: `seed/${sample.slug}.jpg`,
        isPrimary: true,
        displayOrder: 1,
      },
      create: {
        listingId: listing.id,
        url: sample.imageUrl,
        fileKey: `seed/${sample.slug}.jpg`,
        altText: sample.imageAlt,
        isPrimary: true,
        displayOrder: 1,
      },
    });

    for (const [key, value] of Object.entries(sample.attributes)) {
      const attribute = category.attributes.find((candidate) => candidate.key === key);
      if (!attribute) throw new Error(`Unknown ${sample.categorySlug} attribute "${key}".`);
      let valueText: string | null = null;
      let valueNumber: number | null = null;
      let valueBool: boolean | null = null;
      let valueJson: Prisma.InputJsonValue | undefined;

      switch (attribute.dataType) {
        case AttributeDataType.NUMBER:
          if (typeof value !== 'number') throw new Error(`Attribute "${key}" must be numeric.`);
          valueNumber = value;
          break;
        case AttributeDataType.BOOLEAN:
          if (typeof value !== 'boolean') throw new Error(`Attribute "${key}" must be boolean.`);
          valueBool = value;
          break;
        case AttributeDataType.MULTI_SELECT:
          if (!Array.isArray(value)) throw new Error(`Attribute "${key}" must be a list.`);
          valueJson = value;
          break;
        default:
          if (typeof value !== 'string') throw new Error(`Attribute "${key}" must be text.`);
          valueText = value;
      }

      await prisma.listingAttribute.upsert({
        where: {
          listingId_attributeId: {
            listingId: listing.id,
            attributeId: attribute.id,
          },
        },
        update: { valueText, valueNumber, valueBool, valueJson },
        create: {
          listingId: listing.id,
          attributeId: attribute.id,
          valueText,
          valueNumber,
          valueBool,
          valueJson,
        },
      });
    }
  }

  // 5. Seed Platform Default Settings
  await prisma.platformSetting.upsert({
    where: { key: 'global_commission_pct' },
    update: {},
    create: {
      key: 'global_commission_pct',
      valueJson: { percentage: 10.0 },
      description: 'Default platform commission percentage when category/provider override is unset.',
    },
  });

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Super Admin : admin@rentalvala.in / Admin@1234');
  console.log('  Provider    : provider.tech@rentalvala.in / Provider@1234');
  console.log('  Customer    : customer@rentalvala.in / Customer@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });